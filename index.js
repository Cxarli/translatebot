'use strict';

const TOKEN = require('fs').readFileSync('./TOKEN').toString().trim();

const gt = require('translation-google');
const tg = require('node-telegram-bot-api');
const LANGS = {
	getCode: function(desiredLang) {
    	if (!desiredLang) return false;
    	const dl = desiredLang.toLowerCase();
    	if (dl in gt.languages) return dl;
    	return false;
	},
};

const bot = new tg(TOKEN, { polling: true });



let num_this_hour = +process.argv[2] || 0;
let this_hour = (new Date).getHours();
const LIMIT = 50;

function quota() {
	const th = (new Date).getHours();
	if (th != this_hour) {
		this_hour = th;
		num_this_hour = 0;
	}
	num_this_hour++;

	return (num_this_hour <= LIMIT);
}


function reply(msg, text, opts) {
	opts = Object.assign({ parse_mode: 'html' }, opts, { reply_to_message_id: msg.message_id });
	return bot.sendMessage(msg.chat.id, text, opts);
}

function chat(obj) {
	/*
    chat: {
      id: -1001100000001,
      title: "Super Awesome Place",
      type: 'supergroup'
    },
	 */

	return obj.type[0] + obj.type[1] + obj.id + ' <<' + obj.title + '>>';
}

function user(obj) {
	/*
    from: {
      id: 67224235,
      is_bot: false,
      first_name: 'Ĉarli',
      last_name: '🦀',
      username: 'Cxarli',
      language_code: 'sv'
    },
	 */

	let str = '';

	str += '#' + obj.id + ' ';
	if (obj.username) str += '@' + obj.username + ' ';
	if (obj.first_name) {
		str += '(';
		str += obj.first_name;
		if (obj.last_name) str += ' ' + obj.last_name;
		str += ') ';
	}

	// todo pop final space always
	return str.trim();
}

function escape(x) { return x ? x.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;') : 'undefined'; }

function nonl(x) { return x ? x.replace(/\\/g,'\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r') : 'undefined'; }

(async function() {
	'use strict';

	try {

		const me = await bot.getMe();
		// console.debug({ me });
		console.debug(`Connected as ${user(me)}`);
		const MY_ID = me.id;
		const MY_UNAME = me.username;

		bot.on('message', async (msg) => {
			const rmsg = msg.reply_to_message;
			// console.debug({ msg, match });
			
			if (!msg.text) return;
	
			if (msg.text.startsWith("/del") && rmsg && rmsg.from.id == MY_ID) try {
				bot.deleteMessage(rmsg.chat.id, rmsg.message_id);
				console.debug(`${(new Date).toISOString()} @@ ${user(msg.from)} !! deleted message`);
				return;
			} catch (x) { return; }


			if (!/^\/t[rl]([ @]|\n|$)/i.test(msg.text)) return;
			if (/^\/t[rl]@/.test(msg.text) && msg.text.split(' ')[0].split('@')[1] !== MY_UNAME) return;

			try {
				console.debug(`${(new Date).toISOString()} ## ${num_this_hour+1} @@ ${user(msg.from)} ~~ ${chat(msg.chat)} :: ${nonl(msg.caption || msg.text)} %% ${rmsg ? nonl(rmsg.caption || rmsg.text) : '--'}`)

				/*
/tr
/tr TLANG
/tr SLANG TLANG

all optionally followed by newline(s) and a message
				 */
				let lines = (msg.caption || msg.text).split('\n');
				// splice command away
				const parts = lines.shift().split(' ').splice(1).filter(x => x);
				lines = lines.join('\n').trim();

				console.debug({ lines, parts });

				let slang = '', tlang = '', input = '';

				//   /tl from to (text)
				if (parts.length >= 2) { slang = parts.shift(); tlang = parts.shift(); lines = (parts.join(' ') + '\n' + lines).trim(); }
				//   /tl to
				else if (parts.length == 1) { tlang = parts.shift(); }
				//  /tl
				else {}

				switch (true) {
					case !!lines:
						input = input + lines;
						break;

					case !rmsg: break;

					case rmsg.from.id === MY_ID:
						const a = rmsg.text.split('\n');
						const trl = a.shift().trim();
						console.log(`trl: '${trl}'`);
						input = a.join('\n').trim();

						if (slang === '' && /^[a-z-]+ -> [a-z-]+$/i.test(trl)) {
							slang = trl.split('->').pop().trim();
							break;
						}

						else { /* FALLTHROUGH */ break; }

					default:
						input = rmsg.caption || rmsg.text || '';
				}


				const lmap = {
					we: 'cy', // welsh
					dk: 'da', // danish
					ge: 'de', // german
					gr: 'el', // greek
					sp: 'es', // spanish
					ee: 'et', // estonian
					ba: 'eu', // basque
					pe: 'fa', // persian
					ir: 'ga', // irish
					sg: 'gd', // scots gaelic
					cr: 'hr', // croatian
					an: 'hy', // armenian
					he: 'iw', // hebrew
					jp: 'ja', // japanese
					lu: 'lb', // luxembourgish
					lx: 'lb', // luxembourgish
					pu: 'ma', // punjabi
					bu: 'my', // burmese
					ch: 'ny', // chichewa
					al: 'sq', // albanian
					se: 'sv', // swedish
					fl: 'tl', // filipino
					zh: 'zh-cn', // chinese
				};

				if (slang in lmap) slang = lmap[slang];
				if (tlang in lmap) tlang = lmap[tlang];


				const r_slang = slang, r_tlang = tlang;

				if (!slang) slang = 'auto';
				if (!tlang) tlang = 'en';

				slang = LANGS.getCode(slang);
				tlang = LANGS.getCode(tlang);
				
				console.debug({ r_slang, slang, r_tlang, tlang, input });

				if (!slang) { slang = 'auto'; tlang = 'auto'; input = r_slang + ' ' + r_tlang + ' ' + input; }
				else if (!tlang) { tlang = 'auto'; input = r_tlang + ' ' + input; }

				console.debug(`${r_slang}:${slang} -> ${r_tlang}:${tlang} %% ${nonl(input)}`);

				input = input.trim();
				
				if (!input) return void reply(msg, 'There is no text to translate.');

				if (!quota()) return void reply(msg, "Hit the translation quota. Try again next hour.");

				const es_input = input.replace(/@/g, '@@');

				const unames = (
					(es_input.match(/@@[^\s@]+/g) || [])
					.sort((a,b) => b.length - a.length)
				);
				
				const anon = unames.reduce(
					(a,s,i) => a.replace(s, `@${i}@`),
					es_input
				);

				console.debug(`    => anon (${unames}) ${nonl(anon)}`);

				const tres = await gt(anon, { from: slang, to: tlang });

				const rr_slang = tres.from.language.iso;
				if (rr_slang !== slang) slang = `<i>${rr_slang}</i>`;

				const anon_output = tres.text;

				const output = (
					anon_output.replace(/@([0-9]+)@/g,
						(_,i) => unames[i])
					.replace(/@@/g, '@')
				);

				console.debug(`    deanon: ${nonl(anon_output)} => ${nonl(output)}`);

				if (!output) return void reply(msg, "No reply from translation backend.");

				reply(rmsg || msg, `<b>${slang} -> ${tlang}</b>\n\n${escape(output)}`);

			} catch (x) {
				console.error({ date: new Date, msg });
				console.error(x);

				return void reply(msg, "[x_x] translation failed. Maybe ask @Cxarli for help? Error message: <pre>" + x + "</pre>");
			}
		});


		// const res = await gt("Dit is een test", { to: 'en' });
		/*
	 
{
  text: 'This is a test',
  from: {
    language: { didYouMean: false, iso: 'nl' },
    text: { autoCorrected: false, value: '', didYouMean: false }
  },
  raw: ''
}
		 */



	} catch (x) { console.error(x); }
})();
