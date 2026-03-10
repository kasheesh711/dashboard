import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const COLLEGEBASE_APP_URL = "https://app.collegebase.org/";
const COLLEGEBASE_APPLICANT_PROFILES_URL = new URL(
  "data/applicantProfiles.json",
  COLLEGEBASE_APP_URL,
).toString();
const RAW_OUTPUT_PATH = path.join(
  process.cwd(),
  "tmp/collegebase/collegebase-applications.raw.json",
);
const NORMALIZED_OUTPUT_PATH = path.join(
  process.cwd(),
  "tmp/collegebase/collegebase-applications.normalized.json",
);
const DEBUG_OUTPUT_PATH = path.join(
  process.cwd(),
  "tmp/collegebase/collegebase-applications.debug.json",
);
const ATLAS_CLI_PATH = path.join(
  process.env.CODEX_HOME ?? path.join(os.homedir(), ".codex"),
  "skills/atlas/scripts/atlas_cli.py",
);
const ATLAS_BROWSER_DATA_ROOT = path.join(
  os.homedir(),
  "Library/Application Support/com.openai.atlas/browser-data/host",
);
const MIN_EXPECTED_CARD_COUNT = Number.parseInt(
  process.env.COLLEGEBASE_MIN_CARD_COUNT ?? "1122",
  10,
);
const NAVIGATION_TIMEOUT_MS = 120_000;
const SHOW_MORE_WAIT_MS = 15_000;
const NETWORK_FETCH_TIMEOUT_MS = 30_000;
const RETRYABLE_STATUS_CODES = new Set([401, 403, 500, 502, 503, 504]);

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readText(node) {
  if (!node) {
    return "";
  }

  const raw =
    typeof node.innerText === "string" && node.innerText.trim()
      ? node.innerText
      : node.textContent ?? "";
  return normalizeWhitespace(raw);
}

function dedupeStrings(values) {
  const seen = new Set();
  const deduped = [];
  for (const value of values) {
    const normalized = normalizeWhitespace(value);
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(normalized);
  }
  return deduped;
}

function textLinesFromElement(element) {
  const seen = new Set();
  const lines = [];
  const raw = (element?.innerText || element?.textContent || "").split(/\n+/);
  for (const part of raw) {
    const line = normalizeWhitespace(part);
    if (!line) {
      continue;
    }
    if (seen.has(line)) {
      continue;
    }
    seen.add(line);
    lines.push(line);
  }
  return lines;
}

export function extractLabelValuePairsFromText(value) {
  const text = normalizeWhitespace(value);
  if (!text.includes(":")) {
    return {};
  }

  const pairs = {};
  const regex = /([A-Za-z][A-Za-z/&()' -]+):\s*([^:]+?)(?=(?:\s+[A-Za-z][A-Za-z/&()' -]+:)|$)/g;
  let match = regex.exec(text);
  while (match) {
    const key = normalizeWhitespace(match[1]);
    const pairValue = normalizeWhitespace(match[2]);
    if (key && pairValue) {
      pairs[key] = pairValue;
    }
    match = regex.exec(text);
  }
  return pairs;
}

function findSectionHeadingNodes(detailRoot) {
  const candidates = [];
  const selector =
    "h1, h2, h3, h4, h5, h6, [role='heading'], strong, summary, p, span, div";
  for (const node of detailRoot.querySelectorAll(selector)) {
    const text = readText(node);
    if (!text || text.length > 40 || text.includes(":")) {
      continue;
    }
    if (!/[A-Za-z]/.test(text)) {
      continue;
    }
    candidates.push(node);
  }
  return candidates;
}

function findSectionContainerForHeading(headingNode, detailRoot) {
  let current = headingNode;
  let chosen = null;
  while (current && current !== detailRoot) {
    const text = readText(current);
    if (text.length >= 12 && text.length > readText(headingNode).length) {
      chosen = current;
    }
    current = current.parentElement;
  }
  return chosen ?? headingNode.parentElement ?? detailRoot;
}

export function extractOverviewBadges(overviewSection) {
  const badges = [];
  for (const node of overviewSection.querySelectorAll("span, button, p, div")) {
    if (node.children.length > 0) {
      continue;
    }
    const text = readText(node);
    if (!text || text === "OVERVIEW" || text.includes(":")) {
      continue;
    }
    if (text.length > 24) {
      continue;
    }
    if (!/[A-Za-z0-9]/.test(text)) {
      continue;
    }
    badges.push(text);
  }
  return dedupeStrings(badges);
}

export function extractOverviewFields(overviewSection) {
  const overviewFields = {};

  const labelNodes = [
    ...overviewSection.querySelectorAll("strong, b, label"),
  ].filter((node) => /:\s*$/.test(readText(node)));

  for (const labelNode of labelNodes) {
    const key = normalizeWhitespace(readText(labelNode).replace(/:\s*$/, ""));
    if (!key) {
      continue;
    }

    const valueParts = [];
    let current = labelNode.nextSibling;
    while (current) {
      if (
        current.nodeType === 1 &&
        /^(STRONG|B|LABEL)$/.test(current.nodeName)
      ) {
        break;
      }
      valueParts.push(current.textContent ?? "");
      current = current.nextSibling;
    }

    const value = normalizeWhitespace(valueParts.join(" "));
    if (value) {
      overviewFields[key] = value;
    }
  }

  if (Object.keys(overviewFields).length > 0) {
    return overviewFields;
  }

  for (const line of textLinesFromElement(overviewSection)) {
    if (line === "OVERVIEW") {
      continue;
    }
    Object.assign(overviewFields, extractLabelValuePairsFromText(line));
  }
  return overviewFields;
}

export function extractSectionValueFromElement(sectionElement, sectionTitle = "") {
  const clone = sectionElement.cloneNode(true);
  for (const node of clone.querySelectorAll("h1, h2, h3, h4, h5, h6, [role='heading'], strong")) {
    const text = readText(node);
    if (text === sectionTitle || text === "OVERVIEW") {
      node.remove();
    }
  }

  const listItems = dedupeStrings(
    [...clone.querySelectorAll("li")]
      .map((item) => readText(item))
      .map((item) => item.replace(/^\d+[.)]\s*/, "")),
  );
  if (listItems.length > 0) {
    return { kind: "list", value: listItems };
  }

  const lines = textLinesFromElement(clone);
  const kvEntries = {};
  for (const line of lines) {
    const extracted = extractLabelValuePairsFromText(line);
    Object.assign(kvEntries, extracted);
  }
  if (Object.keys(kvEntries).length > 0) {
    return { kind: "kv", value: kvEntries };
  }

  const numberedLines = lines
    .filter((line) => /^\d+[.)]\s*/.test(line))
    .map((line) => line.replace(/^\d+[.)]\s*/, ""));
  if (numberedLines.length > 0) {
    return { kind: "list", value: numberedLines };
  }

  return {
    kind: "text",
    value: normalizeWhitespace(readText(clone)),
  };
}

export function extractRawRecordFromDetailRoot(detailRoot, context = {}) {
  const overviewHeading = findSectionHeadingNodes(detailRoot).find(
    (node) => readText(node).toUpperCase() === "OVERVIEW",
  );
  const overviewSection = overviewHeading
    ? findSectionContainerForHeading(overviewHeading, detailRoot)
    : detailRoot;
  const headings = findSectionHeadingNodes(detailRoot);
  const sectionEntries = [];
  const usedContainers = new Set();

  for (const headingNode of headings) {
    const title = readText(headingNode);
    if (!title) {
      continue;
    }

    if (
      title.toUpperCase() !== "OVERVIEW" &&
      overviewSection &&
      overviewSection.contains(headingNode)
    ) {
      continue;
    }

    const container = findSectionContainerForHeading(headingNode, detailRoot);
    if (!container || usedContainers.has(container)) {
      continue;
    }

    const bodyText = readText(container);
    if (bodyText.length <= title.length) {
      continue;
    }

    usedContainers.add(container);
    sectionEntries.push({
      title,
      container,
    });
  }

  const overviewFields = extractOverviewFields(overviewSection);
  const overviewBadges = extractOverviewBadges(overviewSection);

  const sectionMap = {};
  for (const entry of sectionEntries) {
    if (entry.title.toUpperCase() === "OVERVIEW") {
      continue;
    }
    sectionMap[entry.title] = extractSectionValueFromElement(
      entry.container,
      entry.title,
    );
  }

  return {
    sourceCardIndex: context.sourceCardIndex ?? 0,
    applicationYearLabel: context.applicationYearLabel,
    overviewBadges,
    overviewFields,
    sectionMap,
    capturedTitle: context.capturedTitle ?? "",
    capturedUrl: context.capturedUrl ?? "",
  };
}

function sectionNameMatches(name, expected) {
  return normalizeWhitespace(name).toLowerCase() === expected;
}

function normalizeDelimitedList(value) {
  return dedupeStrings(
    normalizeWhitespace(value)
      .split(/\s*,\s*|\s*;\s*/)
      .map((item) => item.trim()),
  );
}

function parseInteger(value) {
  if (!value) {
    return undefined;
  }
  const match = String(value).match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

function parseFloatNumber(value) {
  if (!value) {
    return undefined;
  }
  const match = String(value).match(/-?\d+(?:\.\d+)?/);
  return match ? Number.parseFloat(match[0]) : undefined;
}

function parseRank(value) {
  const match = String(value ?? "").match(/(\d+)\s*\/\s*(\d+)/);
  return match
    ? {
        classRankDisplay: normalizeWhitespace(value),
        classRankNumerator: Number.parseInt(match[1], 10),
        classRankDenominator: Number.parseInt(match[2], 10),
      }
    : {
        classRankDisplay: normalizeWhitespace(value),
      };
}

function getSectionByName(sectionMap, expectedName) {
  return Object.entries(sectionMap).find(([name]) =>
    sectionNameMatches(name, expectedName.toLowerCase()),
  )?.[1];
}

export function buildSourceId(record) {
  const payload = JSON.stringify({
    applicationYearLabel: record.applicationYearLabel ?? null,
    overview: record.overview,
    academics: record.academics,
    extracurricularItems: record.extracurricularItems,
    awardItems: record.awardItems,
    acceptanceSchoolNames: record.acceptanceSchoolNames,
    otherSections: record.otherSections,
  });
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

export function normalizeRawRecord(rawRecord) {
  const overviewFields = rawRecord.overviewFields ?? {};
  const academicsSection = getSectionByName(rawRecord.sectionMap ?? {}, "academics");
  const extracurricularSection = getSectionByName(
    rawRecord.sectionMap ?? {},
    "extracurriculars",
  );
  const awardsSection = getSectionByName(rawRecord.sectionMap ?? {}, "awards");
  const acceptancesSection = getSectionByName(
    rawRecord.sectionMap ?? {},
    "acceptances",
  );

  const academicsRawItems =
    academicsSection?.kind === "kv" && academicsSection.value
      ? academicsSection.value
      : {};
  const rank = parseRank(academicsRawItems.Rank);

  const record = {
    sourceId: "",
    listName: "all",
    sourceCardIndex: rawRecord.sourceCardIndex,
    applicationYearLabel: rawRecord.applicationYearLabel,
    overview: {
      badges: rawRecord.overviewBadges ?? [],
      intendedMajors: normalizeDelimitedList(
        overviewFields.Major ?? overviewFields.Majors ?? "",
      ),
      raceLabel: overviewFields.Race,
      genderLabel: overviewFields.Gender,
    },
    academics: {
      satComposite: parseInteger(academicsRawItems.SAT),
      actComposite: parseInteger(academicsRawItems.ACT),
      unweightedGpa: parseFloatNumber(academicsRawItems["Unweighted GPA"]),
      weightedGpa: parseFloatNumber(academicsRawItems["Weighted GPA"]),
      classRankDisplay: rank.classRankDisplay,
      classRankNumerator: rank.classRankNumerator,
      classRankDenominator: rank.classRankDenominator,
      apCourseCount: parseInteger(academicsRawItems["AP Courses"]),
      ibCourseCount: parseInteger(academicsRawItems["IB Courses"]),
      rawItems: academicsRawItems,
    },
    extracurricularItems:
      extracurricularSection?.kind === "list"
        ? extracurricularSection.value.map((description, index) => ({
            sortOrder: index + 1,
            description,
          }))
        : [],
    awardItems:
      awardsSection?.kind === "list"
        ? awardsSection.value.map((description, index) => ({
            sortOrder: index + 1,
            description,
          }))
        : [],
    acceptanceSchoolNames:
      acceptancesSection?.kind === "list"
        ? [...acceptancesSection.value]
        : acceptancesSection?.kind === "text"
          ? normalizeDelimitedList(acceptancesSection.value)
          : [],
    otherSections: Object.fromEntries(
      Object.entries(rawRecord.sectionMap ?? {}).filter(([name]) => {
        const key = normalizeWhitespace(name).toLowerCase();
        return !["academics", "extracurriculars", "awards", "acceptances"].includes(
          key,
        );
      }),
    ),
    sourceSnapshot: {
      url: rawRecord.capturedUrl ?? "",
      title: rawRecord.capturedTitle ?? "",
    },
  };

  record.sourceId = buildSourceId(record);
  return record;
}

export function normalizeRawExport(rawExport) {
  return {
    records: (rawExport.records ?? []).map((record) => normalizeRawRecord(record)),
  };
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = normalizeWhitespace(result.stderr || result.stdout || "");
    throw new Error(stderr || `Command failed: ${command} ${args.join(" ")}`);
  }

  return result.stdout ?? "";
}

function requireAtlasCli() {
  if (!existsSync(ATLAS_CLI_PATH)) {
    throw new Error(`Atlas CLI not found at ${ATLAS_CLI_PATH}.`);
  }
}

function listAtlasTabs() {
  const output = runCommand("python3.12", [ATLAS_CLI_PATH, "tabs", "--json"]);
  return JSON.parse(output);
}

function focusAtlasTab(windowId, tabIndex) {
  runCommand("python3.12", [
    ATLAS_CLI_PATH,
    "focus-tab",
    String(windowId),
    String(tabIndex),
  ]);
}

function ensureOutputDirectory() {
  mkdirSync(path.dirname(RAW_OUTPUT_PATH), { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sanitizeUrlForDebug(value) {
  try {
    const parsed = new URL(value);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return String(value).split("?")[0];
  }
}

function summarizeJsonValue(value, depth = 0) {
  if (value == null) {
    return value;
  }
  if (depth >= 2) {
    if (Array.isArray(value)) {
      return { type: "array", length: value.length };
    }
    if (typeof value === "object") {
      return { type: "object", keys: Object.keys(value).slice(0, 12) };
    }
    return value;
  }
  if (Array.isArray(value)) {
    return {
      type: "array",
      length: value.length,
      first: value.length ? summarizeJsonValue(value[0], depth + 1) : null,
    };
  }
  if (typeof value === "object") {
    const summary = {};
    for (const key of Object.keys(value).slice(0, 12)) {
      summary[key] = summarizeJsonValue(value[key], depth + 1);
    }
    return summary;
  }
  return value;
}

function getAtlasProfileInfo() {
  const localStatePath = path.join(ATLAS_BROWSER_DATA_ROOT, "Local State");
  if (!existsSync(localStatePath)) {
    throw new Error(
      `Atlas browser profile was not found at ${ATLAS_BROWSER_DATA_ROOT}.`,
    );
  }

  const localState = JSON.parse(readFileSync(localStatePath, "utf8"));
  const profileDirectory = localState.profile?.last_used ?? "Default";
  const profilePath = path.join(ATLAS_BROWSER_DATA_ROOT, profileDirectory);

  if (!existsSync(profilePath)) {
    throw new Error(`Atlas profile directory was not found at ${profilePath}.`);
  }

  return {
    localStatePath,
    profileDirectory,
    profilePath,
  };
}

function cloneAtlasProfileToTemp() {
  const { localStatePath, profileDirectory, profilePath } = getAtlasProfileInfo();
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "collegebase-atlas-"));
  cpSync(localStatePath, path.join(tempRoot, "Local State"));
  cpSync(profilePath, path.join(tempRoot, profileDirectory), { recursive: true });
  return {
    tempRoot,
    profileDirectory,
  };
}

async function launchAtlasBackedBrowser(profileDirectory, tempRoot) {
  const context = await chromium.launchPersistentContext(tempRoot, {
    channel: "chrome",
    headless: false,
    args: [`--profile-directory=${profileDirectory}`],
    viewport: { width: 1600, height: 1200 },
  });

  const page = context.pages()[0] ?? (await context.newPage());
  return { context, page };
}

async function installCollegebasePageHelpers(page) {
  await page.evaluate(() => {
    const normalize = (value) =>
      String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const findApplicationsColumn = () =>
      [...document.querySelectorAll("div")]
        .filter((node) => isVisible(node))
        .map((node) => ({
          node,
          rect: node.getBoundingClientRect(),
          text: normalize(node.innerText || node.textContent || ""),
          overflowY: window.getComputedStyle(node).overflowY,
          scrollHeight: node.scrollHeight,
        }))
        .filter(
          (entry) =>
            entry.rect.left < 600 &&
            entry.rect.width >= 200 &&
            entry.rect.width <= 320 &&
            entry.rect.height >= 600 &&
            /(auto|scroll)/.test(entry.overflowY) &&
            (entry.text.match(/\b20\d{2}\b/g) || []).length > 10,
        )
        .sort((left, right) => right.scrollHeight - left.scrollHeight)[0]?.node ??
      null;

    const getCards = () => {
      const column = findApplicationsColumn();
      if (!column) {
        return [];
      }
      return [...column.children].filter(
        (node) =>
          node instanceof HTMLElement &&
          /\b20\d{2}\b/.test(normalize(node.innerText || node.textContent || "")),
      );
    };

    const getShowMoreClickPoint = () => {
      const column = findApplicationsColumn();
      if (!column) {
        return null;
      }

      column.scrollTop = column.scrollHeight;

      const target = [
        ...column.querySelectorAll("button, [role='button'], div, span, a"),
      ]
        .filter((node) => isVisible(node))
        .find((node) => normalize(node.textContent || "") === "Show More");

      if (!target) {
        return null;
      }

      const rect = target.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
    };

    window.__collegebaseExtractor = {
      cardCount: () => getCards().length,
      showMoreClickPoint: getShowMoreClickPoint,
    };
  });
}

async function openApplicationsTool(page) {
  await page.goto(COLLEGEBASE_APP_URL, {
    waitUntil: "domcontentloaded",
    timeout: NAVIGATION_TIMEOUT_MS,
  });
  await page.waitForTimeout(2_500);

  const applicationsLink = page.locator("p", { hasText: "Applications" }).first();
  await applicationsLink.click();
  await page.waitForTimeout(1_500);

  const launchTool = page.getByText("Launch Tool", { exact: true }).first();
  await launchTool.click();
  await page.waitForTimeout(4_000);
}

function isApplicantProfileRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return (
    "id" in value &&
    "createdat" in value &&
    "year" in value &&
    "flair" in value &&
    "demographics" in value &&
    "academics" in value &&
    "extracurricular_activities" in value &&
    "awards" in value &&
    "decisions" in value
  );
}

export function isApplicantProfilesPayload(value) {
  return Array.isArray(value) && value.length > 0 && isApplicantProfileRecord(value[0]);
}

export function findApplicantProfilesCapture(captures) {
  const exactMatch = captures.find(
    (capture) =>
      sanitizeUrlForDebug(capture.url) === COLLEGEBASE_APPLICANT_PROFILES_URL,
  );
  if (exactMatch?.json && isApplicantProfilesPayload(exactMatch.json)) {
    return exactMatch;
  }

  for (const capture of captures) {
    if (isApplicantProfilesPayload(capture.json)) {
      return capture;
    }
  }

  return exactMatch;
}

function createCaptureState() {
  return {
    captures: [],
    requestUrlPatterns: [],
    applicantProfilesPayload: null,
    applicantProfilesUrl: null,
  };
}

function attachNetworkCapture(page, captureState) {
  page.on("response", async (response) => {
    try {
      const request = response.request();
      const resourceType = request.resourceType();
      if (!["fetch", "xhr"].includes(resourceType)) {
        return;
      }

      const url = response.url();
      const contentType = response.headers()["content-type"] || "";
      const capture = {
        url,
        method: request.method(),
        status: response.status(),
        type: resourceType,
        contentType,
      };

      captureState.captures.push(capture);

      const sanitizedUrl = sanitizeUrlForDebug(url);
      if (!captureState.requestUrlPatterns.includes(sanitizedUrl)) {
        captureState.requestUrlPatterns.push(sanitizedUrl);
      }

      if (!contentType.includes("application/json")) {
        return;
      }

      const json = await response.json().catch(() => null);
      if (
        sanitizeUrlForDebug(url) === COLLEGEBASE_APPLICANT_PROFILES_URL &&
        isApplicantProfilesPayload(json)
      ) {
        capture.json = json;
        capture.summary = {
          type: "applicantProfiles",
          count: json.length,
        };
        captureState.applicantProfilesPayload = json;
        captureState.applicantProfilesUrl = url;
        return;
      }

      capture.summary = summarizeJsonValue(json);
    } catch {
      // Ignore capture failures and rely on the browser-fetch fallback.
    }
  });
}

async function waitForCardCountIncrease(page, previousCount) {
  const deadline = Date.now() + SHOW_MORE_WAIT_MS;
  while (Date.now() <= deadline) {
    const count = await page.evaluate(
      () => window.__collegebaseExtractor.cardCount(),
    );
    if (count > previousCount) {
      return count;
    }
    await sleep(400);
  }
  return previousCount;
}

async function loadFullApplicationsList(page) {
  await installCollegebasePageHelpers(page);

  let loadedCount = await page.evaluate(
    () => window.__collegebaseExtractor.cardCount(),
  );
  if (!loadedCount) {
    throw new Error(
      "Unable to find the Applications card list. Open Applications > All and rerun.",
    );
  }

  while (true) {
    const clickPoint = await page.evaluate(
      () => window.__collegebaseExtractor.showMoreClickPoint(),
    );
    if (!clickPoint) {
      break;
    }

    const previousCount = loadedCount;
    await page.mouse.click(clickPoint.x, clickPoint.y);
    loadedCount = await waitForCardCountIncrease(page, previousCount);
    if (loadedCount <= previousCount) {
      break;
    }
    await page.waitForTimeout(500);
  }

  return page.evaluate(() => window.__collegebaseExtractor.cardCount());
}

async function fetchJsonInBrowser(page, url) {
  const result = await page.evaluate(
    async ({ targetUrl, timeoutMs }) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(targetUrl, {
          credentials: "include",
          signal: controller.signal,
        });
        const text = await response.text();
        return {
          ok: response.ok,
          status: response.status,
          contentType: response.headers.get("content-type") ?? "",
          text,
        };
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    { targetUrl: url, timeoutMs: NETWORK_FETCH_TIMEOUT_MS },
  );

  let json = null;
  if (result.text) {
    try {
      json = JSON.parse(result.text);
    } catch {
      json = null;
    }
  }

  return {
    ...result,
    json,
  };
}

async function fetchApplicantProfilesWithRetry(page, candidateUrl) {
  const requestUrl = candidateUrl || COLLEGEBASE_APPLICANT_PROFILES_URL;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await fetchJsonInBrowser(page, requestUrl);
    if (result.ok && isApplicantProfilesPayload(result.json)) {
      return {
        profiles: result.json,
        requestUrl,
      };
    }

    if (attempt === 0 && RETRYABLE_STATUS_CODES.has(result.status)) {
      await page.reload({
        waitUntil: "domcontentloaded",
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      await page.waitForTimeout(2_500);
      continue;
    }

    throw new Error(
      `Unable to fetch applicant profiles from ${requestUrl} (status ${result.status || "unknown"}).`,
    );
  }

  throw new Error(`Unable to fetch applicant profiles from ${requestUrl}.`);
}

function normalizeDisplayValue(value, fallback = "None") {
  if (value == null) {
    return fallback;
  }
  const normalized = normalizeWhitespace(value);
  return normalized || fallback;
}

function toList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

function stringifyExtracurricularItem(item) {
  if (!item || typeof item !== "object") {
    return normalizeWhitespace(item);
  }

  const title = normalizeWhitespace(item.title);
  const description = normalizeWhitespace(item.description);
  if (title && description) {
    return `${title}: ${description}`;
  }
  return title || description;
}

function buildKeyValueSection(entries) {
  const value = Object.fromEntries(
    entries.filter(([, entryValue]) => normalizeWhitespace(entryValue)),
  );
  return Object.keys(value).length > 0
    ? { kind: "kv", value }
    : null;
}

function buildListSection(values) {
  const list = dedupeStrings(values.filter(Boolean));
  return list.length > 0 ? { kind: "list", value: list } : null;
}

function buildTextSection(value) {
  const text = normalizeWhitespace(value);
  return text ? { kind: "text", value: text } : null;
}

function buildAcademicsSection(academics = {}) {
  const safeAcademics =
    academics && typeof academics === "object" ? academics : {};
  const apTesting = Array.isArray(safeAcademics.ap_testing)
    ? safeAcademics.ap_testing
        .map((item) => normalizeWhitespace(item))
        .filter(Boolean)
    : [];

  return buildKeyValueSection([
    ["SAT", normalizeDisplayValue(safeAcademics.sat)],
    ["ACT", normalizeDisplayValue(safeAcademics.act)],
    ["Unweighted GPA", normalizeDisplayValue(safeAcademics.unweighted_gpa)],
    ["Weighted GPA", normalizeDisplayValue(safeAcademics.weighted_gpa)],
    ["Rank", normalizeDisplayValue(safeAcademics.rank)],
    ["AP Courses", normalizeDisplayValue(safeAcademics.number_of_ap_courses)],
    ["IB Courses", normalizeDisplayValue(safeAcademics.number_of_ib_courses)],
    ["Honors Courses", normalizeDisplayValue(safeAcademics.number_of_honors_courses)],
    ["IB", normalizeDisplayValue(safeAcademics.ib)],
    ["AP Testing", normalizeDisplayValue(apTesting.join(", "))],
  ]);
}

function buildEssaysSection(essays = {}) {
  const safeEssays = essays && typeof essays === "object" ? essays : {};
  return buildKeyValueSection([
    [
      "Common App Essay Topic",
      normalizeWhitespace(safeEssays.common_app_essay?.topic_overview),
    ],
    [
      "Supplemental Essay Topic",
      normalizeWhitespace(safeEssays.supplemental_essays?.topic_overview),
    ],
    [
      "Supplemental Essay School",
      normalizeWhitespace(safeEssays.supplemental_essays?.school_name),
    ],
  ]);
}

function buildRatingsSection(rating = {}) {
  const safeRating = rating && typeof rating === "object" ? rating : {};
  return buildKeyValueSection([
    ["Academic Score", normalizeWhitespace(safeRating.academic_score)],
    ["Extracurricular Score", normalizeWhitespace(safeRating.extracurricular_score)],
    ["Awards Score", normalizeWhitespace(safeRating.awards_score)],
    ["Overall Score", normalizeWhitespace(safeRating.overall_score)],
  ]);
}

export function mapApplicantProfileToRawRecord(profile, context = {}) {
  const demographics = profile.demographics ?? {};
  const academicsSection = buildAcademicsSection(profile.academics);
  const extracurricularSection = buildListSection(
    (profile.extracurricular_activities ?? []).map(stringifyExtracurricularItem),
  );
  const awardsSection = buildListSection(toList(profile.awards));
  const acceptancesSection = buildListSection(
    toList(profile.decisions?.acceptances),
  );
  const rejectionsSection = buildListSection(toList(profile.decisions?.rejections));
  const waitlistsSection = buildListSection(toList(profile.decisions?.waitlists));
  const hooksSection = buildTextSection(demographics.hooks);
  const lettersSection = buildListSection(
    (profile.letters_of_recommendation ?? []).map((item) => {
      if (!item || typeof item !== "object") {
        return normalizeWhitespace(item);
      }
      const recommender = normalizeWhitespace(item.recommender);
      const quality = normalizeWhitespace(item.relationship_and_quality);
      if (recommender && quality) {
        return `${recommender}: ${quality}`;
      }
      return recommender || quality;
    }),
  );
  const interviewsSection = buildListSection(toList(profile.interviews));
  const essaysSection = buildEssaysSection(profile.essays);
  const tagsSection = buildListSection(toList(profile.tags));
  const ratingSection = buildRatingsSection(profile.rating);
  const assignedCategorySection = buildTextSection(profile.assigned_category);

  const overviewFields = Object.fromEntries(
    [
      ["Major", demographics.intended_major],
      ["Race", demographics.race_ethnicity],
      ["Gender", demographics.gender],
      ["Residence", demographics.residence],
      ["Income Bracket", demographics.income_bracket],
      ["Type of School", demographics.type_of_school],
    ]
      .map(([key, value]) => [key, normalizeWhitespace(value)])
      .filter(([, value]) => value),
  );

  const sectionMap = Object.fromEntries(
    [
      ["Academics", academicsSection],
      ["Extracurriculars", extracurricularSection],
      ["Awards", awardsSection],
      ["Acceptances", acceptancesSection],
      ["Rejections", rejectionsSection],
      ["Waitlists", waitlistsSection],
      ["Hooks", hooksSection],
      ["Letters of Recommendation", lettersSection],
      ["Interviews", interviewsSection],
      ["Essays", essaysSection],
      ["Tags", tagsSection],
      ["Rating", ratingSection],
      ["Assigned Category", assignedCategorySection],
    ].filter(([, section]) => section),
  );

  return {
    sourceCardIndex: context.sourceCardIndex ?? 0,
    applicationYearLabel: normalizeWhitespace(profile.year),
    overviewBadges: dedupeStrings(
      Array.isArray(profile.flair)
        ? profile.flair.map((value) => normalizeWhitespace(value))
        : [],
    ),
    overviewFields,
    sectionMap,
    capturedTitle: context.capturedTitle ?? "",
    capturedUrl: context.capturedUrl ?? "",
    transportMetadata: {
      profileId: profile.id,
      createdAt: profile.createdat ?? null,
      sourceDataUrl: context.sourceDataUrl ?? "",
    },
  };
}

export function buildRawExportFromApplicantProfiles(profiles, context = {}) {
  return {
    source: "collegebase",
    listName: "all",
    extractedAt: context.extractedAt ?? new Date().toISOString(),
    extractionMode: "atlas_profile_network_replay",
    sourceUrl: context.sourceUrl ?? COLLEGEBASE_APP_URL,
    recordCount: profiles.length,
    records: profiles.map((profile, index) =>
      mapApplicantProfileToRawRecord(profile, {
        sourceCardIndex: index + 1,
        capturedTitle: context.capturedTitle ?? "",
        capturedUrl: context.capturedUrl ?? context.sourceUrl ?? COLLEGEBASE_APP_URL,
        sourceDataUrl: context.sourceDataUrl ?? "",
      }),
    ),
  };
}

function buildDebugArtifact(partial = {}) {
  return {
    extractionMode: "atlas_profile_network_replay",
    requestUrlPatterns: [],
    loadedCardCount: 0,
    discoveredApplicantProfilesUrl: null,
    fetchedProfileCount: 0,
    identifierCount: 0,
    firstFailingApplicationIdentifier: null,
    errorMessage: null,
    ...partial,
  };
}

function writeDebugArtifact(debugArtifact) {
  ensureOutputDirectory();
  writeFileSync(DEBUG_OUTPUT_PATH, JSON.stringify(debugArtifact, null, 2));
}

export async function extractCollegebaseApplications() {
  requireAtlasCli();
  ensureOutputDirectory();
  runCommand("python3.12", [ATLAS_CLI_PATH, "app-name"]);

  const tab = listAtlasTabs().find((candidate) =>
    String(candidate.url ?? "").startsWith(COLLEGEBASE_APP_URL),
  );
  if (!tab) {
    throw new Error(
      "No CollegeBase tab is open in ChatGPT Atlas. Open the logged-in Applications view and rerun.",
    );
  }

  focusAtlasTab(tab.window_id, tab.tab_index);

  const debugArtifact = buildDebugArtifact();
  const { tempRoot, profileDirectory } = cloneAtlasProfileToTemp();
  let context;

  try {
    const launched = await launchAtlasBackedBrowser(profileDirectory, tempRoot);
    context = launched.context;
    const page = launched.page;
    const captureState = createCaptureState();
    attachNetworkCapture(page, captureState);

    await openApplicationsTool(page);
    const loadedCardCount = await loadFullApplicationsList(page);
    debugArtifact.loadedCardCount = loadedCardCount;

    if (loadedCardCount < MIN_EXPECTED_CARD_COUNT) {
      throw new Error(
        `CollegeBase loaded only ${loadedCardCount} cards, below the expected minimum of ${MIN_EXPECTED_CARD_COUNT}.`,
      );
    }

    await page.waitForTimeout(1_000);
    debugArtifact.requestUrlPatterns = captureState.requestUrlPatterns;

    const capture = findApplicantProfilesCapture(captureState.captures);
    if (capture?.url) {
      debugArtifact.discoveredApplicantProfilesUrl = sanitizeUrlForDebug(capture.url);
    }

    let profiles = captureState.applicantProfilesPayload;
    let sourceDataUrl = captureState.applicantProfilesUrl ?? COLLEGEBASE_APPLICANT_PROFILES_URL;

    if (!isApplicantProfilesPayload(profiles)) {
      const fetched = await fetchApplicantProfilesWithRetry(
        page,
        capture?.url ?? captureState.applicantProfilesUrl ?? COLLEGEBASE_APPLICANT_PROFILES_URL,
      );
      profiles = fetched.profiles;
      sourceDataUrl = fetched.requestUrl;
      debugArtifact.discoveredApplicantProfilesUrl = sanitizeUrlForDebug(
        fetched.requestUrl,
      );
    }

    if (!isApplicantProfilesPayload(profiles)) {
      throw new Error("Unable to resolve the applicant profiles payload.");
    }

    const identifierList = profiles.map((profile) => profile.id);
    const uniqueIdentifierCount = new Set(identifierList).size;
    debugArtifact.fetchedProfileCount = profiles.length;
    debugArtifact.identifierCount = uniqueIdentifierCount;

    if (uniqueIdentifierCount !== profiles.length) {
      const duplicateId = identifierList.find(
        (identifier, index) => identifierList.indexOf(identifier) !== index,
      );
      debugArtifact.firstFailingApplicationIdentifier = duplicateId ?? null;
      throw new Error(
        `Duplicate applicant profile identifiers were found in applicantProfiles.json.`,
      );
    }

    if (profiles.length !== loadedCardCount) {
      throw new Error(
        `Loaded ${loadedCardCount} cards, but fetched ${profiles.length} applicant profiles.`,
      );
    }

    const rawExport = buildRawExportFromApplicantProfiles(profiles, {
      sourceUrl: page.url(),
      capturedTitle: await page.title(),
      capturedUrl: page.url(),
      sourceDataUrl,
    });
    const normalizedExport = normalizeRawExport(rawExport);

    writeFileSync(RAW_OUTPUT_PATH, JSON.stringify(rawExport, null, 2));
    writeFileSync(NORMALIZED_OUTPUT_PATH, JSON.stringify(normalizedExport, null, 2));
    rmSync(DEBUG_OUTPUT_PATH, { force: true });

    return {
      rawPath: RAW_OUTPUT_PATH,
      normalizedPath: NORMALIZED_OUTPUT_PATH,
      recordCount: rawExport.recordCount ?? rawExport.records?.length ?? 0,
      loadedCardCount,
    };
  } catch (error) {
    debugArtifact.errorMessage =
      error instanceof Error ? error.message : String(error);
    writeDebugArtifact(debugArtifact);
    throw error;
  } finally {
    if (context) {
      await context.close();
    }
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function main() {
  const result = await extractCollegebaseApplications();
  console.log(
    JSON.stringify(
      {
        rawPath: result.rawPath,
        normalizedPath: result.normalizedPath,
        recordCount: result.recordCount,
        loadedCardCount: result.loadedCardCount,
      },
      null,
      2,
    ),
  );
}

const isEntrypoint =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
