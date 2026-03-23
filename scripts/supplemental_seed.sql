-- ASTRA Supplemental Seed: Cyber Security (CSC) & CS Section
-- Adds missing students for the Phase 4 campus pilot

INSERT INTO verified_students (roll_number, full_name, gender, branch, section)
VALUES
('25N81A6258', 'NIKHILESH SHINGADE', 'M', 'CSC', 'CS')
ON CONFLICT (roll_number) DO UPDATE SET 
    full_name = EXCLUDED.full_name, 
    branch = EXCLUDED.branch, 
    section = EXCLUDED.section;

-- Note: User indicated ~65 students in this section. 
-- This supplemental script can be expanded as more data is provided.
