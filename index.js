require('datejs')
const config = require('config')
const Telegraf = require('telegraf')
const { Extra, Markup } = require('telegraf')
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

const tokenTelegram = config.get('tokens.TELEGRAM_TOKEN')
const tokenPoster = config.get('tokens.POSTER_TOKEN')

const apiPoster = 'https://folgabar.joinposter.com/api/'
const apiPosterMethod = 'dash.getTransactions'

const bot = new Telegraf(tokenTelegram)
const getRequest = new XMLHttpRequest();

const helpMsg = `Привет, я TelePost Bot (Telegram / Poster)
Список команд:
/money - Получить информацию о ожидаемой прибыли за выбраный день.`

const monthNames = [
  'Января',
  'Февраля',
  'Марта',
  'Апреля',
  'Мая',
  'Июня',
  'Июля',
  'Августа',
  'Сентября',
  'Октября',
  'Ноября',
  'Декабря'
]

function returnPosterObject (url, params) {
  let fullRequestParams = ''
  for (let i = 0; i < params.length; i++) {
    fullRequestParams += '&' + params[i][0] + '=' + params[i][1]
  }
  getRequest.open('GET', url + fullRequestParams, false);
  getRequest.send();
  return JSON.parse(getRequest.responseText).response;
}

let datesList = [];

for (let i = 0; i < 4; i++) {
  let date = Date.today().add(-i).day()
  let day = date.toString('dd')
  let monthNumber = date.toString('M')
  datesList.push([date.toString('yyyyMMdd'), day + ' ' + monthNames[monthNumber-1]])
}

bot.command('money', (ctx) => {
  return ctx.reply('За какой день считаем баблишко?',
    Markup.inlineKeyboard([
      [
        Markup.callbackButton(datesList[0][1], datesList[0][0]),
        Markup.callbackButton(datesList[1][1], datesList[1][0])
      ],
      [
        Markup.callbackButton(datesList[2][1], datesList[2][0]),
        Markup.callbackButton(datesList[3][1], datesList[3][0])
      ]
    ]).oneTime().extra()
  )
})

bot.hears(/\/start/, (ctx) => {
  ctx.telegram.sendMessage(ctx.from.id, helpMsg)
})

bot.action(/[0-9]{8}/, (ctx) => {
  const dateSelected = ctx.match[0]
  const month = parseInt(dateSelected.substring(4,6))
  const day = dateSelected.substring(6,8)
  const requestUrl = apiPoster + apiPosterMethod + '?format=json&token=' + tokenPoster
  // Return all payed
  let requestParams = [
    ['dateFrom', dateSelected], //date format: yyyymmdd
    ['dateTo', dateSelected], //date format: yyyymmdd
    ['status', '2'] // transactions: 0 - all, 1 - open, 2 - closed, 3 - deleted
  ]
  const requestPayed = returnPosterObject(requestUrl, requestParams)
  let sumCash = 0;
  let sumCard = 0;
  for (let i = 0; i < requestPayed.length; i++) {
    sumCash += requestPayed[i].payed_cash / 100
    sumCard += requestPayed[i].payed_card / 100
  }
  const totalPayed = sumCard + sumCash
  let reply = 'Данные за ' + day + ' ' + monthNames[month-1] + ' 2017' +
    '\n------ Закрытые счета -------' +
    '\nНаличными: ' + sumCash +
    '\nКартами: ' + sumCard +
    '\nОбщая: ' + totalPayed

  // Return all unpayed
  requestParams = [
    ['dateFrom', dateSelected], //date format: yyyymmdd
    ['dateTo', dateSelected], //date format: yyyymmdd
    ['status', '1'] // transactions: 0 - all, 1 - open, 2 - closed, 3 - deleted
  ]
  const requestUnPayed = returnPosterObject(requestUrl, requestParams)
  let sumUnPayed = 0
  for (let i = 0; i < requestUnPayed.length; i++) {
    sumUnPayed += requestUnPayed[i].sum / 100
  }
  reply += '\n----- Не закрытые счета ------' +
    '\nОбщая: ' + sumUnPayed +
    '\n\nОжидаемая прибыль: ' + (totalPayed + sumUnPayed)
  ctx.telegram.sendMessage(ctx.from.id, reply)
})

bot.startPolling()