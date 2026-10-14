import test from 'node:test';import assert from 'node:assert/strict';
import {describeMove} from './moveLog.js';
test('move log shows canonical squares and authoritative outcomes',()=>{
 assert.equal(describeMove({event:'white-move',side:'white',from:'b1',to:'a2'}),'White b1 → a2');
 assert.equal(describeMove({event:'black-move',move:{player:'black',piece:'paper',from:'a6',to:'b5',target:'rock',result:'attacker'}}),'Black paper a6 → b5 · captures rock');
 assert.equal(describeMove({move:{player:'white',piece:'rock',from:'b1',to:'c2',target:'paper',result:'defender'}}),'White rock b1 → c2 · lost to paper');
 assert.equal(describeMove({move:{player:'white',piece:'scissors',from:'h8',to:'i9',result:'goal'}}),'White scissors h8 → i9 · reaches enemy source');
 assert.match(describeMove({move:{player:'black',from:'l12',to:'m13',result:'move'}}),/l12 → m13/);
});
test('historical, rejected, start and forfeit events retain useful information',()=>{
 assert.equal(describeMove({event:'match-start'}),'Match started');
 assert.match(describeMove({event:'white-invalid-move: b1 → b2; turn forfeited: blocked',move:{player:'white',from:'b1',to:'b2',result:'invalid'}}),/White b1 → b2 · invalid move; turn forfeited: blocked/);
 assert.equal(describeMove({event:'white-forfeit: Bot exceeded 100 ms'}),'White forfeits: Bot exceeded 100 ms');
 assert.match(describeMove({event:'black-move'}),/coordinates unavailable/);
 assert.equal(describeMove({from:'b1',to:'a2',event:'White reaches a2 from b1'}),'White reaches a2 from b1');
});
