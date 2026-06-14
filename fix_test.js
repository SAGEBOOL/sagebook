const fs = require('fs');
let c = fs.readFileSync('final_test.js', 'utf8');
c = c.replace(
    "weapons: { expected: '霜华剑', actual: chars[0].weapons?.includes('霜华剑') ? 'Yes' : chars[0].weapons?.substring(0, 40) || '(empty)' },",
    "weapons: { expected: '霜华剑', actual: chars[0].weapons || '(empty)' },"
);
c = c.replace(
    "tags: { expected: '神族', actual: chars[0].tags.includes('神族') ? 'Yes' : 'No' },",
    "tags: { expected: '神族', actual: chars[0].tags || '(empty)' },"
);
fs.writeFileSync('final_test.js', c);
console.log('Done');
