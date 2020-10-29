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

function escape(x) { return x.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;'); }

function nonl(x) { return x.replace(/\\/g,'\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r'); }

(async function() {
	'use strict';

	try {

		const me = await bot.getMe();
		// console.debug({ me });
		console.debug(`Connected as ${user(me)}`);
		const MY_ID = me.id;

		bot.onText(/^\/t[rl]/i, async (msg) => {
			// console.debug({ msg, match });

			try {
				const rmsg = msg.reply_to_message;
				const emsg = rmsg || msg;
			
				console.debug(`${(new Date).toISOString()} ## ${num_this_hour+1} @@ ${user(msg.from)} :: ${nonl(msg.text)} %% ${rmsg ? nonl(rmsg.caption || rmsg.text) : '--'}`)

				/*
/tr
/tr TLANG
/tr SLANG TLANG

all optionally followed by newline(s) and a message
				 */
				let lines = msg.text.split('\n');
				const parts = lines.shift().substring("/tr".length).trim().split(' ').filter(x => x);
				lines = lines.join('\n').trim();

				// console.debug({ lines, parts });

				let slang = '', tlang = '', input = '';

				if (parts.length === 1) tlang = parts.shift();
				else if (parts.length === 2) { slang = parts.shift(); tlang = parts.shift(); }

				switch (true) {
					case !!lines:
						input = lines;
						break;

					case !rmsg: break;

					case rmsg.from.id === MY_ID:
						const a = rmsg.text.split('\n');
						const trl = a.shift().trim();
						input = a.join('\n').trim();

						if (slang === '' && /^[a-z-]+ -> [a-z-]+$/i.test(trl)) {
							slang = trl.split('->').pop().trim();
							break;
						}

						else { /* FALLTHROUGH */ }
					default:
						input = rmsg.caption || rmsg.text || '';
				}


				if (slang.toLowerCase() === 'zh') slang = 'zh-cn';
				if (tlang.toLowerCase() === 'zh') tlang = 'zh-cn';

				// console.debug({ slang, tlang, input });

				if (!slang) slang = 'auto';
				if (!tlang) tlang = 'en';

				slang = LANGS.getCode(slang);
				tlang = LANGS.getCode(tlang);

				if (!slang) return void reply(msg, "&gt;w&lt; sowwy but i cant trawswate from that wangwage");
				if (!tlang) return void reply(msg, "&gt;w&lt; sowwy but i cant trawswate to that wangwage");

				if (!input) return void reply(msg, "Huuuhhhhhhhh where is the text O-O... i dont see any text to twanswate");

				console.debug(`${slang} -> ${tlang} :: ${nonl(input)}`);

				if (!quota()) return void reply(msg, "WWAAAAAaaahhhh wewe hit the wimit &gt;~&lt; mommy google wont let me twawswate more ;-;");

				const tres = await gt(input, { from: slang, to: tlang });

				const r_slang = tres.from.language.iso;
				if (r_slang !== slang) slang = `<i>${r_slang}</i>`;

				const output = tres.text;
				if (!output) return void reply(msg, "mommy google is mad... she didnt twanswate for me... ;-;");

				reply(emsg, `<b>${slang} -> ${tlang}</b>\n\n${escape(output)}`);

			} catch (x) {
				console.error({ date: new Date, msg });
				console.error(x);

				return void reply(msg, "[x_x] i dieded. maybe ask cxarli for help?");
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
