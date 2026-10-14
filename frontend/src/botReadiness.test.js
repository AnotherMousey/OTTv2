import test from 'node:test';import assert from 'node:assert/strict';import {botReadiness} from './botReadiness.js';
test('saved queued and failed bots are distinguished from missing submissions',()=>{assert.equal(botReadiness(undefined).label,'Not submitted');for(const [submissionStatus,label] of [['queued','Validation queued'],['validating','Validating'],['invalid','Invalid bot'],['error','Execution error'],['ready','Validated bot']])assert.equal(botReadiness({botName:'bot.py',submissionStatus}).label,label);assert.equal(botReadiness({botName:'bot.py'}).label,'Saved · not ready');});

test('generated internal filenames are hidden while real filenames stay intact',async()=>{
 const {friendlyBotFilename}=await import('./botReadiness.js');
 assert.equal(friendlyBotFilename('cmv7l26b60000z8nyspa2xd0a_bot.py','Python'),'bot.py');
 assert.equal(friendlyBotFilename('kelvin_strategy.py','Python'),'kelvin_strategy.py');
 assert.equal(friendlyBotFilename('bot.java','Java'),'bot.java');
});
