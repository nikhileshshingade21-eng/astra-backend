const fs = require('fs');
const path = require('path');
const { queryAll } = require('../database_module');

const classesData = [
    // DS-1
    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '314', day: 'Monday', start_time: '09:00', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '314', day: 'Monday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Mr. Afzal', room: '320', day: 'Monday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs Priya', room: '314', day: 'Tuesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '314', day: 'Tuesday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EC', name: 'EC', faculty_name: 'Mrs. D Nalini', room: '314', day: 'Tuesday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. Afzal', room: '314', day: 'Tuesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EC LAB', name: 'EC Lab', faculty_name: 'Mrs. D Nalini/Mrs. Wazida', room: '314', day: 'Tuesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    { code: 'ELCS LAB', name: 'ELCS Lab', faculty_name: 'Dr. Ashima Jose', room: '314', day: 'Wednesday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. Afzal', room: '314', day: 'Wednesday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '314', day: 'Wednesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '314', day: 'Wednesday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Field', day: 'Wednesday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '314', day: 'Thursday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs Priya', room: '314', day: 'Thursday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. Afzal', room: '314', day: 'Thursday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EC', name: 'EC', faculty_name: 'Mrs. D Nalini', room: '314', day: 'Thursday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EWS LAB', name: 'EWS Lab', faculty_name: 'Mr. Venu Madhav', room: '314', day: 'Thursday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Mrs. A Sravanthi', room: 'G-15', day: 'Friday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'YOGA', name: 'Yoga', faculty_name: '', room: '314', day: 'Friday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '314', day: 'Friday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Mr. T Balachary', room: '314', day: 'Friday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '314', day: 'Saturday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs Priya', room: '314', day: 'Saturday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'EC', name: 'EC', faculty_name: 'Mrs. D Nalini', room: '314', day: 'Saturday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Lib', day: 'Saturday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech DS', section: 'DS-1' },
    { code: 'SSLITE', name: 'SSLite', faculty_name: '', room: '314', day: 'Saturday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech DS', section: 'DS-1' },

    // CSE-2
    { code: 'AEP', name: 'AEP', faculty_name: 'Dr. P Gayatri', room: '202', day: 'Monday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '202', day: 'Monday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'ITWS', name: 'IT Workshop', faculty_name: 'Mr. Trishank', room: '220', day: 'Monday', start_time: '11:10', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'BEE', name: 'BEE', faculty_name: 'Mr. M Gopi', room: '202', day: 'Monday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Lib', day: 'Monday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    { code: 'AEP', name: 'AEP', faculty_name: 'Dr. P Gayatri', room: '202', day: 'Tuesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'EDCAD', name: 'EDCAD', faculty_name: 'Mr. K Anil Kumar', room: '320', day: 'Tuesday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '202', day: 'Tuesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'BEE LAB', name: 'BEE Lab', faculty_name: 'Mr. M Gopi', room: '202', day: 'Tuesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '202', day: 'Wednesday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'DS', name: 'DS', faculty_name: 'Dr. Subhasree', room: '202', day: 'Wednesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Mr. B Ramesh', room: 'G-15', day: 'Wednesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    { code: 'AEP', name: 'AEP', faculty_name: 'Dr. P Gayatri', room: '202', day: 'Thursday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'BEE', name: 'BEE', faculty_name: 'Mr. M Gopi', room: '202', day: 'Thursday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'DS', name: 'DS', faculty_name: 'Dr. Subhasree', room: '202', day: 'Thursday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '202', day: 'Thursday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'AEP LAB', name: 'AEP Lab', faculty_name: 'Mr. A Sandeep', room: '202', day: 'Thursday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    { code: 'AEP', name: 'AEP', faculty_name: 'Dr. P Gayatri', room: '202', day: 'Friday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Dr. Subhasree', room: '220', day: 'Friday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'EDCAD', name: 'EDCAD', faculty_name: 'Mr. K Anil Kumar', room: '202', day: 'Friday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'DS', name: 'DS', faculty_name: 'Dr. Subhasree', room: '202', day: 'Friday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Field', day: 'Friday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    { code: 'BEE', name: 'BEE', faculty_name: 'Mr. M Gopi', room: '202', day: 'Saturday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '202', day: 'Saturday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Mr. K Praveen', room: '202', day: 'Saturday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Mr. K Praveen', room: '202', day: 'Saturday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech CSE', section: 'CSE-2' },
    { code: 'SSLITE', name: 'SSLite', faculty_name: '', room: '202', day: 'Saturday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech CSE', section: 'CSE-2' },

    // AIML-1
    { code: 'DS', name: 'DS', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Monday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Ms. Priya', room: '302', day: 'Monday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Monday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EC', name: 'EC', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Monday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ELCS LAB', name: 'ELCS Lab', faculty_name: 'Dr. Ashima', room: '302', day: 'Monday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Mr. MD Afzal', room: '220', day: 'Tuesday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EC', name: 'EC', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Tuesday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '302', day: 'Tuesday', start_time: '12:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Wednesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Dr. P Rammohan', room: '302', day: 'Wednesday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Wednesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EC LAB', name: 'EC Lab', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Wednesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Mr. Farooq', room: '320', day: 'Thursday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Ms. Priya', room: '302', day: 'Thursday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Thursday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Thursday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Field', day: 'Thursday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    { code: 'EC', name: 'EC', faculty_name: 'Dr. D Appa Rao', room: '302', day: 'Friday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'DS', name: 'DS', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Friday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Dr. MD Ahmed', room: '302', day: 'Friday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Ms. Priya', room: '302', day: 'Friday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Dr. Ashima Jose', room: '302', day: 'Friday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Lib', day: 'Friday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    { code: 'DS', name: 'DS', faculty_name: 'Mr. MD Afzal', room: '302', day: 'Saturday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'EWS LAB', name: 'EWS Lab', faculty_name: 'Mr. Venu Madhav', room: '302', day: 'Saturday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'YOGA', name: 'Yoga', faculty_name: '', room: '302', day: 'Saturday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-1' },
    { code: 'SSLITE', name: 'SSLite', faculty_name: '', room: '302', day: 'Saturday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-1' },

    // AIML-5
    { code: 'PYTHON LAB', name: 'Python Lab', faculty_name: 'Dr. MD Khaja', room: 'G-15', day: 'Monday', start_time: '09:00', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mr. S Pradeep', room: '313', day: 'Monday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Monday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'LBP', name: 'LBP', faculty_name: 'Venu Madhav', room: '313', day: 'Monday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },

    { code: 'DS', name: 'DS', faculty_name: 'Dr. MD Khaja', room: '313', day: 'Tuesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Tuesday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'YOGA', name: 'Yoga', faculty_name: '', room: '313', day: 'Tuesday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EC', name: 'EC', faculty_name: 'Dr. B Bhavani', room: '313', day: 'Tuesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EWS LAB', name: 'EWS Lab', faculty_name: 'Venu Madhav', room: '313', day: 'Tuesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },

    { code: 'EC', name: 'EC', faculty_name: 'Dr. B Bhavani', room: '313', day: 'Wednesday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'DS', name: 'DS', faculty_name: 'Dr. MD Khaja', room: '313', day: 'Wednesday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mr. S Pradeep', room: '313', day: 'Wednesday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Wednesday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'DS LAB', name: 'DS Lab', faculty_name: 'Dr. MD Khaja', room: '220', day: 'Wednesday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },

    { code: 'DS', name: 'DS', faculty_name: 'Dr. MD Khaja', room: '313', day: 'Thursday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ESE', name: 'ESE', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Thursday', start_time: '10:10', end_time: '11:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Thursday', start_time: '11:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mr. S Pradeep', room: '313', day: 'Thursday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ELCS LAB', name: 'ELCS Lab', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Thursday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },

    { code: 'SOFT SKILLS', name: 'Soft Skills', faculty_name: 'Atoshi Roy', room: '313', day: 'Friday', start_time: '09:00', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EC', name: 'EC', faculty_name: 'Dr. B Bhavani', room: '313', day: 'Friday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'ODEVC', name: 'ODEVC', faculty_name: 'Mr. S Pradeep', room: '313', day: 'Friday', start_time: '13:50', end_time: '14:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'LIBRARY', name: 'Library', faculty_name: '', room: 'Lib', day: 'Friday', start_time: '15:00', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },

    { code: 'EDC', name: 'EDC', faculty_name: 'Mrs. Sruthi', room: '313', day: 'Saturday', start_time: '09:00', end_time: '10:00', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'EC LAB', name: 'EC Lab', faculty_name: 'Dr. B Bhavani', room: '313', day: 'Saturday', start_time: '10:10', end_time: '12:10', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'SPORTS', name: 'Sports', faculty_name: '', room: 'Field', day: 'Saturday', start_time: '12:50', end_time: '13:50', prog: 'B.Tech AIML', section: 'AIML-5' },
    { code: 'SSLITE', name: 'SSLite', faculty_name: '', room: '313', day: 'Saturday', start_time: '13:50', end_time: '16:00', prog: 'B.Tech AIML', section: 'AIML-5' },
];

async function run() {
    // 1. Clear old classes to avoid clashes
    await queryAll("DELETE FROM classes");
    
    // 2. Insert new timetable
    for (const c of classesData) {
        await queryAll(
            `INSERT INTO classes (code, name, faculty_name, room, day, start_time, end_time, programme, section, zone_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [c.code, c.name, c.faculty_name, c.room, c.day, c.start_time, c.end_time, c.prog, c.section, 1]
        );
    }
    console.log('Inserted timetable.');

    // 3. Migrate local students.js
    const stdPath = path.join(__dirname, '..', '..', 'astra-rn', 'src', 'data', 'students.js');
    let stdContent = fs.readFileSync(stdPath, 'utf-8');

    // Mappings:
    stdContent = stdContent.replace(/section: 'C 2'/g, "section: 'CSE-2'");
    stdContent = stdContent.replace(/section: 'C 1'/g, "section: 'CSE-1'");
    stdContent = stdContent.replace(/section: 'C 3'/g, "section: 'CSE-3'");
    stdContent = stdContent.replace(/section: 'C 4'/g, "section: 'CSE-4'");
    stdContent = stdContent.replace(/section: 'C 5'/g, "section: 'CSE-5'");

    stdContent = stdContent.replace(/section: 'A 1'/g, "section: 'AIML-1'");
    stdContent = stdContent.replace(/section: 'A 2'/g, "section: 'AIML-5'");

    stdContent = stdContent.replace(/prog: 'B\.Tech CSC', branch: 'CSC', section: 'CS'/g, "prog: 'B.Tech DS', branch: 'DS', section: 'DS-1'");

    fs.writeFileSync(stdPath, stdContent, 'utf-8');
    console.log('Updated students.js with new sections.');

    // 4. Also insert these students into the real DB users table so they map properly.
    // Parse the object from the modified file via regex or require if possible...
    // simpler is just executing the file partially to get the array
    const fixedContent = stdContent
        .replace('export const STUDENTS = ', 'module.exports = ')
        .replace(/;?\s*$/, '');

    const tmpPath = path.join(__dirname, 'tmp_students.js');
    fs.writeFileSync(tmpPath, fixedContent, 'utf-8');

    const studentsArr = require('./tmp_students');
    fs.unlinkSync(tmpPath);

    for (const st of studentsArr) {
        await queryAll(
            `INSERT INTO users (roll_number, name, programme, section, role, password_hash)
            VALUES ($1, $2, $3, $4, 'student', '123')
            ON CONFLICT (roll_number) DO NOTHING`,
            [st.id, st.name, st.prog, st.section]
        );
    }
    console.log('Inserted missing students into DB');

    console.log('All done!');
}

run().catch(console.error);
