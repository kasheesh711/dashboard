import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildRawExportFromApplicantProfiles,
  buildSourceId,
  extractRawRecordFromDetailRoot,
  findApplicantProfilesCapture,
  isApplicantProfilesPayload,
  mapApplicantProfileToRawRecord,
  normalizeRawExport,
} from "../scripts/collegebase/extract.mjs";

const FIXTURES_DIR = path.join(process.cwd(), "tests/fixtures");

function renderDetailFixture() {
  document.body.innerHTML = `
    <section data-testid="detail-root">
      <div class="overview-card">
        <h2>OVERVIEW</h2>
        <div class="badges">
          <span>3.4+</span>
          <span>1300+/28+</span>
          <span>stem</span>
        </div>
        <p><strong>Major:</strong> biochem, public health, premed <strong>Race:</strong> african american <strong>Gender:</strong> Female</p>
      </div>
      <div class="academics-card">
        <h3>Academics</h3>
        <p>SAT: 1370</p>
        <p>ACT: 32</p>
        <p>Unweighted GPA: 3.7</p>
        <p>Weighted GPA: 4</p>
        <p>Rank: 120/700</p>
        <p>AP Courses: 7</p>
        <p>IB Courses: None</p>
      </div>
      <div class="extracurriculars-card">
        <h3>Extracurriculars</h3>
        <ol>
          <li>HOSA president</li>
          <li>NHS president</li>
          <li>anti-drug club president</li>
        </ol>
      </div>
      <div class="acceptances-card">
        <h3>Acceptances</h3>
        <ul>
          <li>Tuskegee University</li>
          <li>Jackson State University</li>
          <li>Duke University</li>
        </ul>
      </div>
      <div class="awards-card">
        <h3>Awards</h3>
        <ol>
          <li>state speech contest winner</li>
          <li>film fest finalist</li>
        </ol>
      </div>
      <div class="hooks-card">
        <h3>Hooks</h3>
        <p>QuestBridge finalist and first-generation college student.</p>
      </div>
    </section>
  `;

  return document.querySelector("[data-testid='detail-root']") as HTMLElement;
}

describe("CollegeBase extraction helpers", () => {
  it("maps detail DOM into the planned raw export shape", () => {
    const detailRoot = renderDetailFixture();
    const record = extractRawRecordFromDetailRoot(detailRoot, {
      sourceCardIndex: 1,
      applicationYearLabel: "2023",
      capturedTitle: "Collegebase | See Who Got In and Why",
      capturedUrl: "https://app.collegebase.org/",
    });
    const sectionMap = record.sectionMap as Record<string, unknown>;

    expect(record.overviewBadges).toEqual(["3.4+", "1300+/28+", "stem"]);
    expect(record.overviewFields).toEqual({
      Major: "biochem, public health, premed",
      Race: "african american",
      Gender: "Female",
    });
    expect(sectionMap["Academics"]).toEqual({
      kind: "kv",
      value: {
        SAT: "1370",
        ACT: "32",
        "Unweighted GPA": "3.7",
        "Weighted GPA": "4",
        Rank: "120/700",
        "AP Courses": "7",
        "IB Courses": "None",
      },
    });
    expect(sectionMap["Extracurriculars"]).toEqual({
      kind: "list",
      value: ["HOSA president", "NHS president", "anti-drug club president"],
    });
    expect(sectionMap["Acceptances"]).toEqual({
      kind: "list",
      value: [
        "Tuskegee University",
        "Jackson State University",
        "Duke University",
      ],
    });
    expect(sectionMap["Hooks"]).toEqual({
      kind: "text",
      value: "QuestBridge finalist and first-generation college student.",
    });
  });

  it("normalizes academics, overview metadata, and ordered lists", () => {
    const detailRoot = renderDetailFixture();
    const rawExport = {
      source: "collegebase",
      listName: "all",
      extractedAt: "2026-03-10T10:00:00.000Z",
      extractionMode: "atlas_javascript_injection",
      sourceUrl: "https://app.collegebase.org/",
      recordCount: 1,
      records: [
        extractRawRecordFromDetailRoot(detailRoot, {
          sourceCardIndex: 1,
          applicationYearLabel: "2023",
          capturedTitle: "Collegebase | See Who Got In and Why",
          capturedUrl: "https://app.collegebase.org/",
        }),
      ],
    };

    const normalized = normalizeRawExport(rawExport);
    expect(normalized.records).toHaveLength(1);
    expect(normalized.records[0]).toMatchObject({
      listName: "all",
      sourceCardIndex: 1,
      applicationYearLabel: "2023",
      overview: {
        badges: ["3.4+", "1300+/28+", "stem"],
        intendedMajors: ["biochem", "public health", "premed"],
        raceLabel: "african american",
        genderLabel: "Female",
      },
      academics: {
        satComposite: 1370,
        actComposite: 32,
        unweightedGpa: 3.7,
        weightedGpa: 4,
        classRankDisplay: "120/700",
        classRankNumerator: 120,
        classRankDenominator: 700,
        apCourseCount: 7,
      },
      extracurricularItems: [
        { sortOrder: 1, description: "HOSA president" },
        { sortOrder: 2, description: "NHS president" },
        { sortOrder: 3, description: "anti-drug club president" },
      ],
      awardItems: [
        { sortOrder: 1, description: "state speech contest winner" },
        { sortOrder: 2, description: "film fest finalist" },
      ],
      acceptanceSchoolNames: [
        "Tuskegee University",
        "Jackson State University",
        "Duke University",
      ],
      sourceSnapshot: {
        title: "Collegebase | See Who Got In and Why",
        url: "https://app.collegebase.org/",
      },
    });
    expect(normalized.records[0].otherSections).toEqual({
      Hooks: {
        kind: "text",
        value: "QuestBridge finalist and first-generation college student.",
      },
    });
  });

  it("keeps source ids stable and handles sparse records", () => {
    const sparseRecord = {
      sourceCardIndex: 9,
      applicationYearLabel: undefined,
      overviewBadges: [],
      overviewFields: {},
      sectionMap: {
        Acceptances: { kind: "list", value: ["Albany College"] },
      },
      capturedTitle: "Collegebase | See Who Got In and Why",
      capturedUrl: "https://app.collegebase.org/",
    };

    const normalized = normalizeRawExport({ records: [sparseRecord] });
    const firstId = normalized.records[0].sourceId;
    const secondId = buildSourceId(normalized.records[0]);

    expect(firstId).toBe(secondId);
    expect(normalized.records[0]).toMatchObject({
      overview: {
        badges: [],
        intendedMajors: [],
      },
      academics: {
        rawItems: {},
      },
      extracurricularItems: [],
      awardItems: [],
      acceptanceSchoolNames: ["Albany College"],
    });
  });

  it("detects the applicantProfiles network capture from fixture data", () => {
    const captures = JSON.parse(
      readFileSync(
        path.join(FIXTURES_DIR, "collegebase-network-captures.sample.json"),
        "utf8",
      ),
    );

    const capture = findApplicantProfilesCapture(captures);
    expect(capture?.url).toBe(
      "https://app.collegebase.org/data/applicantProfiles.json",
    );
    expect(isApplicantProfilesPayload(capture?.json)).toBe(true);
  });

  it("maps applicantProfiles payload records into the raw export shape", () => {
    const profiles = JSON.parse(
      readFileSync(
        path.join(FIXTURES_DIR, "collegebase-applicantProfiles.sample.json"),
        "utf8",
      ),
    );

    const rawRecord = mapApplicantProfileToRawRecord(profiles[0], {
      sourceCardIndex: 1,
      capturedTitle: "Collegebase | See Who Got In and Why",
      capturedUrl: "https://app.collegebase.org/",
      sourceDataUrl: "https://app.collegebase.org/data/applicantProfiles.json",
    });

    expect(rawRecord).toMatchObject({
      sourceCardIndex: 1,
      applicationYearLabel: "2023",
      overviewBadges: ["3.8+", "1500+/34+", "art/hum"],
      overviewFields: {
        Major: "Studio Art, Illustration",
        Race: "Asian",
        Gender: "Female",
        Residence: "East Coast",
        "Type of School": "Public",
      },
      sectionMap: {
        Academics: {
          kind: "kv",
          value: {
            SAT: "1500",
            ACT: "None",
            "Unweighted GPA": "3.86",
            "Weighted GPA": "4.68",
            Rank: "None",
            "AP Courses": "7",
            "IB Courses": "None",
            "Honors Courses": "2",
            IB: "None",
            "AP Testing": "AP Art, AP US History",
          },
        },
        Extracurriculars: {
          kind: "list",
          value: [
            "President and founder of heraldry club",
            "Student aid in counseling office: Peer support and admin work",
          ],
        },
        Waitlists: {
          kind: "list",
          value: ["Tufts University"],
        },
        Hooks: {
          kind: "text",
          value: "First-Gen",
        },
      },
    });
    expect(rawRecord.transportMetadata).toEqual({
      profileId: 1,
      createdAt: "2023-03-30T15:34:14.000Z",
      sourceDataUrl: "https://app.collegebase.org/data/applicantProfiles.json",
    });
  });

  it("builds and normalizes an export from applicantProfiles fixtures", () => {
    const profiles = JSON.parse(
      readFileSync(
        path.join(FIXTURES_DIR, "collegebase-applicantProfiles.sample.json"),
        "utf8",
      ),
    );

    const rawExport = buildRawExportFromApplicantProfiles(profiles, {
      sourceUrl: "https://app.collegebase.org/",
      capturedTitle: "Collegebase | See Who Got In and Why",
      capturedUrl: "https://app.collegebase.org/",
      sourceDataUrl: "https://app.collegebase.org/data/applicantProfiles.json",
      extractedAt: "2026-03-10T10:00:00.000Z",
    });
    const normalized = normalizeRawExport(rawExport);

    expect(rawExport.recordCount).toBe(2);
    expect(normalized.records).toHaveLength(2);
    expect(normalized.records[0]).toMatchObject({
      listName: "all",
      sourceCardIndex: 1,
      applicationYearLabel: "2023",
      overview: {
        badges: ["3.8+", "1500+/34+", "art/hum"],
        intendedMajors: ["Studio Art", "Illustration"],
        raceLabel: "Asian",
        genderLabel: "Female",
      },
      acceptanceSchoolNames: [
        "University of Maryland, College Park",
        "School of Visual Arts",
      ],
    });
    expect(normalized.records[0].otherSections).toMatchObject({
      Rejections: {
        kind: "list",
        value: ["Wesleyan University"],
      },
      Waitlists: {
        kind: "list",
        value: ["Tufts University"],
      },
      Hooks: {
        kind: "text",
        value: "First-Gen",
      },
    });
    expect(normalized.records[1]).toMatchObject({
      sourceCardIndex: 2,
      applicationYearLabel: "2021",
      academics: {
        actComposite: 31,
        classRankDisplay: "12/300",
        classRankNumerator: 12,
        classRankDenominator: 300,
      },
      acceptanceSchoolNames: ["Albany College"],
    });
  });
});
