'use strict';

const gt = require('translation-google');
const tg = require('node-telegram-bot-api');
const LANGS = require('google-translate-api').languages;

const bot = new tg(require('fs').readFileSync('./TOKEN').toString().trim(), { polling: true });


let num_this_hour = +process.argv[2];
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

(async function() {
	'use strict';

	try {

		const me = await bot.getMe();
		// console.debug({ me });
		console.debug(`Connected as ${user(me)}`);

		bot.onText(/^\/tr (from:[a-z]+ )?([a-z]+)( .+)?/i, async (msg, match) => {
			// console.debug({ msg, match });
			console.debug(`${(new Date).toISOString()} ## ${num_this_hour+1} @@ ${user(msg.from)} :: ${msg.text}`)

			try {
				const rmsg = msg.reply_to_message;
				const emsg = rmsg || msg;
				let froml = LANGS.getCode(match[1] ? match[1].split('from:')[1].trim() : 'auto');
				const tol = LANGS.getCode(match[2]);
				const fromt = (match[3] || (rmsg ? (rmsg.text || rmsg.caption) : '') || '').trim();
				// console.debug({ froml, tol, fromt });
				console.debug(`${froml} -> ${tol} :: ${fromt}`);

				if (!fromt) return void reply(msg, "No text to translate.");
				if (!froml) return void reply(msg, "Can't understand 'from' language.");
				if (!tol) return void reply(msg, "Can't understand 'to' language.");

				if (!quota()) return void reply(msg, "Sorry, too many translations. Please try again next hour.");

				const tres = await gt(fromt, { from: froml, to: tol });
				const ffroml = tres.from.language.iso;
				if (ffroml !== froml) froml = `<i>${ffroml}</i>`;
				const tr = tres.text;
				if (!tr) return void reply(msg, "Translation failed");

				reply(emsg, `<b>${froml} -> ${tol}</b>\n\n${tr}`);

			} catch (x) {
				console.error({ msg, match });
				console.error(x);

				return void reply(msg, "Sorry, I crashed. Please leave me alone for a while so I can recover.");
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
