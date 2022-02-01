rx = require('rxjs');
const request = require("request");
const source = rx.timer(0, 6 * 10000);
const TelegramBot = require('node-telegram-bot-api');
// const { date } = require('azure-storage');

const token = '1518314289:AAFCyRiMBNnejXKpgT3OkNctvaLPLXKXC7c';
const bot = new TelegramBot(token, { polling: true });
const p1 = {
  DISTRICT_IDS: [474],
  MIN_AGE_LIMIT: 18,
  MAX_AGE_LIMIT: 100,
  TELEGRAM: 1161102780,
  REQUIREMENTS: ['available_capacity_dose1']
}
const p2 = {
  DISTRICT_IDS: [472],
  MIN_AGE_LIMIT: 18,
  MAX_AGE_LIMIT: 19,
  TELEGRAM: 1526482448,
  REQUIREMENTS: ['available_capacity_dose1']
}
const p3 = {
  DISTRICT_IDS: [446],
  MIN_AGE_LIMIT: 18,
  BLOCK_NAME: 'Bhubaneswar',
  MAX_AGE_LIMIT: 19,
  TELEGRAM: 1847744929,
  // TELEGRAM: 1526482448,
  REQUIREMENTS: ['available_capacity_dose1']
}
let tryCount = 0;
const people = [p2, p3];

let subscribe = null;

function runEngine() {
  subscribe = source.subscribe(val => {
    handleEveryoneBetter();
  });
}

runEngine();


function getProperDate(reverseDate) {
  let a = reverseDate.split("-");
  return a[2] + "-" + a[1] + "-" + a[0];
}


function checkSlot2(date, districtid) {
  let url = `https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=${districtid}&date=${date}`;
  return new Promise((resolve, reject) => {
    request.get(url, (error, response, body) => {
      if (error) {
        // reject(error);
        tryCount += 1;
        subscribe.unsubscribe();
        runEngine();
      }
      if (body) {
        let json = JSON.parse(body);
        resolve(json);
      }
    })
  });
}




function handleEveryoneBetter() {
  const today = new Date()
  const tomorrow = new Date(today)
  const tomorrow_1 = new Date(tomorrow)
  const tomorrow_2 = new Date(tomorrow_1)
  const tomorrow_3 = new Date(tomorrow_2)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow_1.setDate(tomorrow_1.getDate() + 1)
  tomorrow_2.setDate(tomorrow_2.getDate() + 1)
  tomorrow_3.setDate(tomorrow_3.getDate() + 1)
  let date1 = getProperDate(today.toISOString().slice(0, 10));
  let date2 = getProperDate(tomorrow.toISOString().slice(0, 10));
  let date3 = getProperDate(tomorrow_1.toISOString().slice(0, 10));
  let date4 = getProperDate(tomorrow_2.toISOString().slice(0, 10));
  let date5 = getProperDate(tomorrow_3.toISOString().slice(0, 10));
  let dateArray = [date1, date2, date3, date4, date5];

  people.forEach((person) => {
    handlePerson(person, dateArray).then((availableCenters) => {
      try {
        if (availableCenters.length > 0) {
          let message = JSON.stringify(availableCenters.map((center) => center.name + ',' + center.district_name));
          message = message.slice(0, 1500);
          availableCenters.forEach((center) => { console.log(JSON.stringify(center) + '\n' + '\n') });
          bot.sendMessage(person.TELEGRAM, message);
        } else {
          console.log(JSON.stringify(availableCenters));
        }
      } catch (e) {
        tryCount += 1;
        subscribe.unsubscribe();
        runEngine();
      }
    })
  });

}

function handlePerson(person, dateArray) {
  return new Promise((resolve, reject) => {

    let promiseArray = [];
    let availableSessions = [];
    dateArray.forEach((date) => {
      person.DISTRICT_IDS.forEach((id) => {
        promiseArray.push(checkSlot2(date, id));
      });
    });

    Promise.all(promiseArray).then((values) => {
      try {
        console.log('Tried', tryCount);
        values.forEach((response) => {
          response.centers.forEach((center) => {
            center.sessions.forEach((session) => {
              if (session.min_age_limit >= person.MIN_AGE_LIMIT && session.min_age_limit < person.MAX_AGE_LIMIT) {
                person.REQUIREMENTS.forEach((requirement) => {
                  if (session[requirement] > 0) {
                    if (person.BLOCK_NAME && center.block_name.includes(person.BLOCK_NAME)) {
                      availableSessions.push(center);
                    } else {
                      availableSessions.push(center);
                    }
                  }
                })
              }
            });
          });
        })
        resolve(availableSessions);
      } catch (e) {
        tryCount += 1;
        subscribe.unsubscribe();
        runEngine();
      }
    }).catch(err => {
      tryCount += 1;
      subscribe.unsubscribe();
      runEngine();
      reject(err)
    })
  })
}



function recieveClient() {
  // Matches "/echo [whatever]"
  bot.onText(/\/echo (.+)/, (msg, match) => {
    // 'msg' is the received Message from Telegram
    // 'match' is the result of executing the regexp above on the text content
    // of the message

    const chatId = msg.chat.id;
    const resp = match[1]; // the captured "whatever"

    // send back the matched "whatever" to the chat
    bot.sendMessage(chatId, resp);
  });

  // Listen for any kind of message. There are different kinds of
  // messages.
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    // send a message to the chat acknowledging receipt of their message
    bot.sendMessage(chatId, 'Received your message');
  });
}
// recieveClient();
// bot.sendMessage(1847744929, 'Kutu');
