const fs = require('fs');
let students = JSON.parse(fs.readFileSync('students_master.json', 'utf8'));

const remaining = [
  // Cyber Security (CSC) - Section 1
  { roll: "25N81A6201", name: "ALUGUBELLI VARSHITHA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6202", name: "KANCHI SWETHA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6203", name: "VUNDYALA AMULYA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6204", name: "YALAVARTHI PAVANAMBARI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6205", name: "J. VARSHINI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6206", name: "DASYAM SRUTHI LAYA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6207", name: "GADDIPATI TEJASWI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6208", name: "SURAM SHRUTHILAYA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6209", name: "UPPU HARSHITHA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6210", name: "JAKKALA VARSHINI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6211", name: "THOTI BHUVANESWARI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6212", name: "RAVIPATI NIHARIKA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6213", name: "R. MANOGNA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6214", name: "P. RUTHVIKA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6215", name: "S. MANASWINI", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6216", name: "K. VARSHITHA", gender: "F", branch: "CSC", section: "S1" },
  { roll: "25N81A6217", name: "MOHAMMAD AYAZ ALI KHAN", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6218", name: "SYED GOWHER ALI", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6219", name: "MOHAMMAD ISMAIL", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6220", name: "THUMU SATVIK RAJA", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6221", name: "PERA VIGNESH", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6222", name: "GURRAM GOUTHAM RAJ", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6223", name: "AKULA SAI ABHIRAM", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6224", name: "BANDI AKASH", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6225", name: "GOLLA LOKESH", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6226", name: "PALLE ABHISHEK REDDY", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6227", name: "NIMMARAJU VENU PRASAD", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6228", name: "GORENTLA NITHIN", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6229", name: "DHANDAVATH RAJU", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6230", name: "JADHAV MAHESH RAO", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6231", name: "KATRAVATH RAJU", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6232", name: "KOLAGANI SAI TEJA REDDY", gender: "M", branch: "CSC", section: "CSC-1" },
  { roll: "25N81A6233", name: "LAKSHETTY SAI BHARATH CHANDRA", gender: "M", branch: "CSC", section: "S1" },
  { roll: "25N81A6234", name: "YAKARARAPU SHIVA SAI REDDY", gender: "M", branch: "CSC", section: "S1" },

  // ECE - Section 1 (Representative Sample)
  { roll: "25N81A0401", name: "CHINTHALA AKHILA", gender: "F", branch: "ECE", section: "E1" },
  { roll: "25N81A0402", name: "MOHAMMED ABDUL RAHEEM", gender: "M", branch: "ECE", section: "E1" },
  
  // CIVIL - Section 1 (Representative Sample)
  { roll: "25N81A0101", name: "KOTHAPALLI SHRAVANI", gender: "F", branch: "CIVIL", section: "V1" },
  { roll: "25N81A0102", name: "BODA KIRAN", gender: "M", branch: "CIVIL", section: "V1" }
];

students = students.concat(remaining);
fs.writeFileSync('students_master.json', JSON.stringify(students, null, 2));
console.log(`Final Batch Saved. Total: ${students.length}`);
