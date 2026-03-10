insert into profiles (id, email, full_name)
values
  ('11111111-1111-1111-1111-111111111111', 'alicia.wong@begifted.example', 'Alicia Wong'),
  ('22222222-2222-2222-2222-222222222222', 'daniel.brooks@begifted.example', 'Daniel Brooks'),
  ('33333333-3333-3333-3333-333333333333', 'narin.chai@begifted.example', 'Narin Chai'),
  ('44444444-4444-4444-4444-444444444444', 'mali.sae-lim@begifted.example', 'Mali Sae-Lim'),
  ('55555555-5555-5555-5555-555555555555', 'kevin.hsieh@begifted.example', 'Kevin Hsieh'),
  ('66666666-6666-6666-6666-666666666661', 'lydia.chen@example.com', 'Lydia Chen'),
  ('66666666-6666-6666-6666-666666666662', 'suda.rattanachai@example.com', 'Suda Rattanachai'),
  ('66666666-6666-6666-6666-666666666663', 'rhea.singh@example.com', 'Rhea Singh'),
  ('66666666-6666-6666-6666-666666666664', 'eunji.park@example.com', 'Eunji Park'),
  ('66666666-6666-6666-6666-666666666665', 'pim.wattan@example.com', 'Pim Wattan')
on conflict (id) do nothing;

insert into profile_roles (profile_id, role)
values
  ('11111111-1111-1111-1111-111111111111', 'strategist'),
  ('22222222-2222-2222-2222-222222222222', 'strategist'),
  ('33333333-3333-3333-3333-333333333333', 'ops'),
  ('44444444-4444-4444-4444-444444444444', 'ops'),
  ('55555555-5555-5555-5555-555555555555', 'strategist'),
  ('55555555-5555-5555-5555-555555555555', 'ops'),
  ('66666666-6666-6666-6666-666666666661', 'parent'),
  ('66666666-6666-6666-6666-666666666662', 'parent'),
  ('66666666-6666-6666-6666-666666666663', 'parent'),
  ('66666666-6666-6666-6666-666666666664', 'parent'),
  ('66666666-6666-6666-6666-666666666665', 'parent')
on conflict (profile_id, role) do nothing;

insert into families (
  id, slug, student_name, parent_contact_name, pathway, tier,
  strategist_owner_id, ops_owner_id, current_phase, overall_status,
  status_reason, created_date, last_updated_date
)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'emma-chen', 'Emma Chen', 'Lydia Chen', 'us_college', 'Signature Pathway', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Application build', 'green', 'Essay roadmap is locked, spring deadlines are on track, and there are no silent blockers.', '2025-09-02', '2026-03-09'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'nathan-rattanachai', 'Nathan Rattanachai', 'Suda Rattanachai', 'us_college', 'Core Pathway', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'Profile build', 'yellow', 'Academic momentum is fine, but summer positioning is still unresolved and one term project is behind.', '2025-10-01', '2026-03-08'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'priya-singh', 'Priya Singh', 'Rhea Singh', 'us_college', 'Application Intensive', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'Application recovery', 'red', 'Two critical deadlines slipped, recommenders are not fully aligned, and the family has not confirmed the revised application scope.', '2025-12-11', '2026-03-10'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'leo-park', 'Leo Park', 'Eunji Park', 'us_college', 'Signature Pathway', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'Foundation year', 'yellow', 'The lane is promising, but Leo still needs stronger independent execution on his flagship CS project.', '2025-08-20', '2026-03-06'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'maya-wattan', 'Maya Wattan', 'Pim Wattan', 'us_college', 'Core Pathway', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Launch and roadmap', 'green', 'Onboarding outputs landed on time and the first 90-day plan is locked with clear owners.', '2026-01-15', '2026-03-05')
on conflict (id) do nothing;

insert into family_contacts (id, family_id, full_name, email, relationship, is_primary, user_id)
values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Lydia Chen', 'lydia.chen@example.com', 'Mother', true, '66666666-6666-6666-6666-666666666661'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Suda Rattanachai', 'suda.rattanachai@example.com', 'Mother', true, '66666666-6666-6666-6666-666666666662'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Rhea Singh', 'rhea.singh@example.com', 'Mother', true, '66666666-6666-6666-6666-666666666663'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Eunji Park', 'eunji.park@example.com', 'Mother', true, '66666666-6666-6666-6666-666666666664'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Pim Wattan', 'pim.wattan@example.com', 'Father', true, '66666666-6666-6666-6666-666666666665')
on conflict (id) do nothing;

insert into monthly_summaries (
  id, family_id, reporting_month, biggest_win, biggest_risk,
  top_next_action_1, top_next_action_2, top_next_action_3,
  parent_visible_summary, internal_summary_notes
)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-01', 'Emma finalized her personal statement angle around climate-focused engineering and matched it with two new competition results.', 'The robotics portfolio still needs one cleaner evidence package before April outreach.', 'Finalize MIT maker portfolio evidence folder', 'Lock recommender briefing packets', 'Complete two supplemental essay outlines before March 24', 'March is moving well. Emma has a strong story arc in place, tutoring remains aligned to AP Physics and SAT Math priorities, and the immediate focus is packaging her strongest evidence before early spring deliverables.', 'No escalation needed. Use next parent call to reinforce why portfolio curation matters more than adding another minor activity.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc12', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-02-01', 'Profile narrative narrowed successfully from general sustainability to engineering systems.', 'Teacher recommender timing was still soft in February.', 'Confirm two recommenders', 'Review competition reflection write-up', 'Close SAT retest decision', 'February established a sharper application direction and clarified the testing decision.', 'Needed extra strategist follow-up on recommender ownership.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc21', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-01', 'Nathan’s economics research question is now clear and tutor support has stabilized AP Statistics execution.', 'The summer program decision is lagging and could compress application positioning later.', 'Finalize economics summer shortlist', 'Submit term project abstract', 'Lock AP Statistics remediation plan', 'Nathan has a clearer academic lane, but the next two weeks matter because the summer plan needs to move from options to commitment.', 'Strategist should push for a decision meeting, not another open-ended brainstorm.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc31', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-03-01', 'Priya’s revised school list is now academically coherent after removing unrealistic reaches.', 'Recommendation packet and portfolio evidence are both behind, creating deadline compression immediately.', 'Approve revised school list by March 11', 'Send recommender briefing packet', 'Recover missed design portfolio milestones', 'This is a recovery month. The school list is stronger, but a few delayed inputs now need quick decisions so Priya can move forward without further compression.', 'Escalate if list approval or packet dispatch slips again.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc41', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2026-03-01', 'Leo’s AI-for-education concept now has a usable prototype and stronger mentor feedback.', 'Without better week-to-week execution discipline, the project may stall before external validation.', 'Ship prototype user-test round', 'Submit coding challenge entry', 'Build weekly work cadence with mentor check-ins', 'Leo has real momentum and a much clearer project direction. The immediate work is about consistency, not changing the concept.', 'Avoid expanding scope. Stay focused on cadence and evidence.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc51', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '2026-03-01', 'The launch pack, strengths map, and first project hypothesis were all completed within the onboarding window.', 'Maya still needs to test whether neuroscience or public health is the better long-run fit.', 'Run first mentor discovery session', 'Choose spring reading track', 'Finalize project hypothesis by March 22', 'The launch phase has gone smoothly. Maya now has a clear 90-day roadmap, and the near-term focus is discovering which academic lane fits best before deeper profile work begins.', 'Healthy start. Keep next month focused on direction-finding rather than overcommitting to one lane too early.')
on conflict (id) do nothing;

insert into academic_updates (
  id, family_id, date, subject_priority, grade_or_predicted_trend,
  tutoring_status, tutor_note_summary, test_prep_status, parent_visible
)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddd11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-07', 'AP Physics C and AP Calculus BC', 'Stable A / A- trend with improved problem-set consistency', 'Weekly physics and math support is on schedule', 'Emma is now solving multi-step mechanics questions faster and can explain method choice with less prompting.', 'SAT Math maintenance only', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddd21', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-04', 'AP Statistics and economics writing', 'B+ moving toward A- with recent quiz improvement', 'Twice-weekly statistics sessions active', 'Nathan now catches setup errors earlier, but written explanations still need tighter structure.', 'ACT diagnostic deferred', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddd31', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-03-06', 'Visual arts portfolio narrative and English writing', 'A in studio work, B/B+ in writing-heavy courses', 'Writing support resumed after a two-week gap', 'Priya’s visual thinking is strong, but written articulation still needs aggressive coaching before portfolio explanations are final.', 'Testing out of scope', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddd41', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2026-03-01', 'Computer science and precalculus', 'A- / A trend', 'Subject tutoring is light-touch and stable', 'No academic risk. The bigger issue is project execution outside tutoring hours.', 'SAT diagnostic planned for April', true),
  ('dddddddd-dddd-dddd-dddd-dddddddddd51', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '2026-03-02', 'Biology and writing', 'A / A- trend with strong teacher feedback', 'No heavy remediation needed; enrichment reading support only', 'Academic baseline is healthy, so tutoring can stay light and exploratory for now.', 'No test-prep active this month', true)
on conflict (id) do nothing;

insert into profile_updates (
  id, family_id, date, project_name, milestone_status, evidence_added,
  mentor_note_summary, parent_visible
)
values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee11', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-05', 'Urban Climate Sensors capstone', 'Prototype dashboard finalized; mentor review scheduled', 'Prototype screenshots, one user-feedback memo, revised technical summary', 'The project now shows measurable iteration instead of just concept framing.', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee21', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-03', 'Bangkok traffic microeconomics brief', 'Abstract drafted; evidence collection behind target', 'One outline and source list', 'The idea is promising but still too abstract without a sharper data approach.', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee31', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-03-05', 'Design portfolio rebuild', 'Behind schedule; two caption sets missing', 'Updated project index and one refined case-study page', 'The work quality is good, but the packaging is incomplete and time-sensitive.', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee41', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2026-03-04', 'AI study coach prototype', 'Prototype working; user testing not yet launched', 'Clickable demo and mentor feedback log', 'Strong concept. Now needs real user evidence and weekly output discipline.', true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeee51', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '2026-03-01', 'Health storytelling discovery sprint', 'Hypothesis stage', 'Interest inventory and early reading log', 'Maya asks good questions and should be tested against a real-world health communication problem next.', true)
on conflict (id) do nothing;

insert into tasks (
  id, family_id, item_name, category, owner, due_date, status, dependency_notes, parent_visible
)
values
  ('ffffffff-ffff-ffff-ffff-fffffffff111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'MIT maker portfolio evidence folder', 'application', 'Emma + Alicia Wong', '2026-03-18', 'in_progress', 'Need final captioning on two project photos.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff112', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Recommender briefing packet', 'application', 'Alicia Wong', '2026-03-14', 'in_progress', 'Waiting on latest activity list formatting.', false),
  ('ffffffff-ffff-ffff-ffff-fffffffff211', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Summer program decision meeting', 'project', 'Family + Alicia Wong', '2026-03-12', 'not_started', 'Need financial and travel preference confirmation.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff212', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Project abstract submission', 'project', 'Nathan Rattanachai', '2026-03-08', 'in_progress', 'Requires final evidence plan sign-off.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff311', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Approve revised school list', 'application', 'Rhea Singh', '2026-03-11', 'not_started', 'Needs final family sign-off before essay allocation is locked.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff312', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Send recommender briefing packet', 'application', 'Daniel Brooks', '2026-03-06', 'blocked', 'Waiting on approved activity list and portfolio summary.', false),
  ('ffffffff-ffff-ffff-ffff-fffffffff313', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Portfolio caption recovery sprint', 'project', 'Priya Singh', '2026-03-09', 'in_progress', 'Requires writing coach review.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff411', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'Prototype user-test round', 'project', 'Leo Park', '2026-03-16', 'in_progress', 'Need participant list confirmation.', true),
  ('ffffffff-ffff-ffff-ffff-fffffffff511', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Mentor discovery session', 'project', 'Alicia Wong', '2026-03-15', 'in_progress', '', true)
on conflict (id) do nothing;

insert into decision_log_items (
  id, family_id, date, decision_type, summary, owner,
  pending_family_input, status, parent_visible
)
values
  ('12121212-1212-1212-1212-121212121211', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-06', 'Summer plan', 'Family to confirm whether Emma will accept the climate lab summer placement by March 20.', 'Lydia Chen', true, 'pending', true),
  ('12121212-1212-1212-1212-121212121221', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-01', 'Summer', 'Family needs to choose between the policy lab and the economics bootcamp this month.', 'Suda Rattanachai', true, 'pending', true),
  ('12121212-1212-1212-1212-121212121231', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-03-08', 'School list', 'Family must approve the reduced school list so supplement sequencing can be rebuilt.', 'Rhea Singh', true, 'pending', true),
  ('12121212-1212-1212-1212-121212121241', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2026-03-03', 'Project scope', 'Do not add a second AI feature until the first user test is complete.', 'Daniel Brooks', false, 'resolved', true),
  ('12121212-1212-1212-1212-121212121251', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '2026-03-05', 'Mentor pairing', 'Family agreed to start with a public-health oriented mentor before deciding on the primary lane.', 'Pim Wattan', false, 'resolved', true)
on conflict (id) do nothing;

insert into notes (
  id, family_id, date, author_role, note_type, summary, body, visibility
)
values
  ('13131313-1313-1313-1313-131313131311', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-09', 'tutor_input', 'academic_signal', 'Physics pacing improved materially', 'Tutor reports better endurance on combined mechanics and calculus problem sets.', 'internal'),
  ('13131313-1313-1313-1313-131313131312', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '2026-03-08', 'strategist', 'meeting_recap', 'Monthly strategy review completed', 'Parent alignment was strong. Emma understands the difference between flagship evidence and filler activities.', 'parent'),
  ('13131313-1313-1313-1313-131313131321', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2026-03-07', 'mentor_input', 'project_check', 'Research brief still too broad', 'Nathan needs one narrower market lens or the term output will stay descriptive.', 'internal'),
  ('13131313-1313-1313-1313-131313131331', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2026-03-09', 'ops', 'risk_flag', 'Deadline compression now material', 'Two workstreams are operating with no remaining buffer. Escalation call recommended if March 11 decision is missed.', 'internal')
on conflict (id) do nothing;

insert into artifact_links (
  id, family_id, artifact_name, artifact_type, link_url, upload_date, owner, parent_visible
)
values
  ('14141414-1414-1414-1414-141414141411', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Emma Chen master drive folder', 'drive_folder', 'https://drive.google.com/drive/folders/example-emma-master', '2026-03-01', 'Narin Chai', true),
  ('14141414-1414-1414-1414-141414141412', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'Essay roadmap worksheet', 'sheet', 'https://docs.google.com/spreadsheets/d/example-emma-roadmap', '2026-03-03', 'Alicia Wong', false),
  ('14141414-1414-1414-1414-141414141421', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'Nathan planning folder', 'drive_folder', 'https://drive.google.com/drive/folders/example-nathan-planning', '2026-03-02', 'Narin Chai', true),
  ('14141414-1414-1414-1414-141414141431', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'Priya portfolio drive folder', 'drive_folder', 'https://drive.google.com/drive/folders/example-priya-portfolio', '2026-03-04', 'Daniel Brooks', true),
  ('14141414-1414-1414-1414-141414141441', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'AI study coach demo', 'external_link', 'https://example.com/leo-demo', '2026-03-04', 'Leo Park', true),
  ('14141414-1414-1414-1414-141414141451', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', 'Maya launch pack', 'slide', 'https://docs.google.com/presentation/d/example-maya-launch', '2026-03-01', 'Alicia Wong', true)
on conflict (id) do nothing;

insert into students (
  id, family_id, slug, student_name, grade_level, pathway, tier,
  current_phase, overall_status, status_reason, created_date, last_updated_date
)
select
  case f.id
    when 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1' then '15151515-1515-1515-1515-151515151511'
    when 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2' then '15151515-1515-1515-1515-151515151521'
    when 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3' then '15151515-1515-1515-1515-151515151531'
    when 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4' then '15151515-1515-1515-1515-151515151541'
    else '15151515-1515-1515-1515-151515151551'
  end,
  f.id,
  lower(regexp_replace(f.student_name, '[^a-zA-Z0-9]+', '-', 'g')),
  f.student_name,
  'Grade 11',
  f.pathway,
  f.tier,
  f.current_phase,
  f.overall_status,
  f.status_reason,
  f.created_date,
  f.last_updated_date
from families f
where not exists (
  select 1 from students s where s.family_id = f.id and s.student_name = f.student_name
);

update monthly_summaries ms
set student_id = s.id
from students s
join families f on f.id = s.family_id
where ms.family_id = s.family_id
  and ms.student_id is null
  and s.student_name = f.student_name;

update academic_updates au
set student_id = s.id
from students s
join families f on f.id = s.family_id
where au.family_id = s.family_id
  and au.student_id is null
  and s.student_name = f.student_name;

update profile_updates pu
set student_id = s.id
from students s
join families f on f.id = s.family_id
where pu.family_id = s.family_id
  and pu.student_id is null
  and s.student_name = f.student_name;

update tasks t
set student_id = s.id
from students s
join families f on f.id = s.family_id
where t.family_id = s.family_id
  and t.student_id is null
  and s.student_name = f.student_name;

update decision_log_items d
set student_id = s.id
from students s
join families f on f.id = s.family_id
where d.family_id = s.family_id
  and d.student_id is null
  and s.student_name = f.student_name;

update notes n
set student_id = s.id
from students s
join families f on f.id = s.family_id
where n.family_id = s.family_id
  and n.student_id is null
  and s.student_name = f.student_name;

update artifact_links a
set student_id = s.id
from students s
join families f on f.id = s.family_id
where a.family_id = s.family_id
  and a.student_id is null
  and s.student_name = f.student_name;

insert into students (
  id, family_id, slug, student_name, grade_level, pathway, tier,
  current_phase, overall_status, status_reason, created_date, last_updated_date
)
values
  ('15151515-1515-1515-1515-151515151512', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'lucas-chen', 'Lucas Chen', 'Grade 9', 'us_boarding', 'Foundation Pathway', 'Profile build', 'yellow', 'Early positioning is promising, but testing and activity depth still need clearer structure.', '2026-01-10', '2026-03-06')
on conflict (id) do nothing;

insert into student_testing_profiles (
  id, student_id, current_sat, projected_sat, current_act, projected_act, strategy_note
)
values
  ('16161616-1616-1616-1616-161616161611', '15151515-1515-1515-1515-151515151511', 1460, 1510, null, null, 'No retake unless the next practice exam lands below the 1500 range.'),
  ('16161616-1616-1616-1616-161616161621', '15151515-1515-1515-1515-151515151521', null, null, 28, 31, 'ACT diagnostic deferred until AP Statistics consistency improves.'),
  ('16161616-1616-1616-1616-161616161631', '15151515-1515-1515-1515-151515151531', 1380, 1430, null, null, 'Use current testing as the planning baseline and prioritize list balance.'),
  ('16161616-1616-1616-1616-161616161612', '15151515-1515-1515-1515-151515151512', null, null, null, null, 'SSAT diagnostic scheduled; keep prep exploratory for now.')
on conflict (student_id) do update
set current_sat = excluded.current_sat,
    projected_sat = excluded.projected_sat,
    current_act = excluded.current_act,
    projected_act = excluded.projected_act,
    strategy_note = excluded.strategy_note;

insert into student_activity_items (id, student_id, activity_name, role, impact_summary, sort_order)
values
  ('17171717-1717-1717-1717-171717171711', '15151515-1515-1515-1515-151515151511', 'Robotics Team', 'Build Lead', 'Leads the prototype team and portfolio documentation.', 1),
  ('17171717-1717-1717-1717-171717171712', '15151515-1515-1515-1515-151515151512', 'Debate Club', 'Member', 'Shows early verbal confidence and coachability.', 1),
  ('17171717-1717-1717-1717-171717171721', '15151515-1515-1515-1515-151515151521', 'Economics Research Brief', 'Lead researcher', 'Developing a Bangkok traffic microeconomics brief.', 1)
on conflict (id) do nothing;

insert into student_competition_items (id, student_id, competition_name, result, year_label, sort_order)
values
  ('18181818-1818-1818-1818-181818181811', '15151515-1515-1515-1515-151515151511', 'World Scholar''s Cup', 'Regional gold medals', '2025', 1),
  ('18181818-1818-1818-1818-181818181831', '15151515-1515-1515-1515-151515151531', 'Oxbridge Essay Competition', 'Shortlisted', '2025', 1)
on conflict (id) do nothing;

insert into student_school_targets (id, student_id, school_name, country, bucket, fit_note, sort_order)
values
  ('19191919-1919-1919-1919-191919191811', '15151515-1515-1515-1515-151515151511', 'MIT', 'US', 'reach', 'Strong if portfolio evidence sharpens.', 1),
  ('19191919-1919-1919-1919-191919191812', '15151515-1515-1515-1515-151515151511', 'Northwestern', 'US', 'target', 'Competitive with current testing range.', 2),
  ('19191919-1919-1919-1919-191919191813', '15151515-1515-1515-1515-151515151511', 'Boston University', 'US', 'likely', 'Maintain as a balance school.', 3),
  ('19191919-1919-1919-1919-191919191821', '15151515-1515-1515-1515-151515151521', 'NYU', 'US', 'target', 'Good fit if writing depth keeps improving.', 1),
  ('19191919-1919-1919-1919-191919191822', '15151515-1515-1515-1515-151515151521', 'Boston University', 'US', 'likely', 'Useful balance school while profile strengthens.', 2),
  ('19191919-1919-1919-1919-191919191831', '15151515-1515-1515-1515-151515151531', 'Parsons', 'US', 'target', 'Keep if portfolio recovery continues.', 1),
  ('19191919-1919-1919-1919-191919191832', '15151515-1515-1515-1515-151515151531', 'Pratt', 'US', 'likely', 'Important balance choice while deadlines recover.', 2),
  ('19191919-1919-1919-1919-191919191842', '15151515-1515-1515-1515-151515151512', 'Taft', 'US', 'target', 'Good fit once testing baseline is clearer.', 1)
on conflict (id) do nothing;
