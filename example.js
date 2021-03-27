/**
 * List prompt example
 */

'use strict';
var inquirer = require('inquirer');
var fuzzy = require('fuzzy');
const Choices = require('inquirer/lib/objects/choices');
const { Separator } = require('inquirer');
const {
  FilteredChoice,
  MultipleSelectSearchPrompt,
  BetterCheckboxesPrompt,
  SelectSearchPrompt,
} = require('./');
var chalk = require('chalk');

inquirer.registerPrompt('multiple-select-search', MultipleSelectSearchPrompt);
inquirer.registerPrompt('select-search', SelectSearchPrompt);
inquirer.registerPrompt('better-checkboxes', BetterCheckboxesPrompt);

var states = [
  'Alabama',
  'Alaska',
  'American Samoa',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'District Of Columbia',
  'Federated States Of Micronesia',
  'Florida',
  'Georgia',
  'Guam',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Marshall Islands',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Northern Mariana Islands',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Palau',
  'Pennsylvania',
  'Puerto Rico',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virgin Islands',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

var foods = [
  'Apple',
  'Orange',
  'Banana',
  'Kiwi',
  'Lichi',
  { name: 'Grapefruit', value: 'Grape', short: 'Grapef' },
];

function searchStates(choices, answers, input) {
  input = input || '';
  if (input === '') {
    return null;
  }

  const realChoices = choices.realChoices.map(
    (c, i) => new FilteredChoice(c, answers, i)
  );

  const lastCheckedIndex = realChoices.reduce(
    (acc, choice, index) => (choice.checked ? index : acc),
    -1
  );

  var fuzzyResult = fuzzy.filter(
    input,
    realChoices.slice(lastCheckedIndex + 1),
    {
      pre: '<',
      post: '>',
      extract: (choice) => choice.name,
    }
  );

  return new Choices(
    realChoices
      .slice(0, lastCheckedIndex + 1)
      .map((choice) => {
        const match = fuzzy.match(input, choice.name, { pre: '<', post: '>' });
        choice.name = match
          ? match.rendered.replace(/<([^<>]*)>/g, chalk.bold.cyanBright('$1'))
          : choice.name;
        return choice;
      })
      .concat(
        fuzzyResult.length ? new Separator() : [],
        fuzzyResult.map((el) => {
          el.original.name = el.string.replace(
            /<([^<>]*)>/g,
            chalk.bold.cyanBright('$1')
          );
          return el.original;
        })
      )
  );
}

function searchFood(ordered, ms = 500) {
  return (choices, answers, input) => {
    return new Promise(function (resolve) {
      setTimeout(function () {
        input = input || '';
        if (input === '') {
          resolve(null);
          return;
        }

        const realChoices = choices.realChoices.map(
          (c, i) => new FilteredChoice(c, answers, i)
        );

        const lastCheckedIndex = !ordered
          ? 0
          : realChoices.reduce(
              (acc, choice, index) => (choice.checked ? index : acc),
              -1
            ) + 1;

        var fuzzyResult = fuzzy.filter(
          input,
          realChoices.slice(lastCheckedIndex),
          {
            pre: '<',
            post: '>',
            extract: (choice) => choice.name,
          }
        );

        resolve(
          new Choices(
            realChoices
              .slice(0, lastCheckedIndex)
              .map((choice) => {
                const match = fuzzy.match(input, choice.name, {
                  pre: '<',
                  post: '>',
                });
                choice.name = match
                  ? match.rendered.replace(
                      /<([^<>]*)>/g,
                      chalk.bold.cyanBright('$1')
                    )
                  : choice.name;
                return choice;
              })
              .concat(
                fuzzyResult.length && ordered ? new Separator() : [],
                fuzzyResult.map((el) => {
                  el.original.name = el.string.replace(
                    /<([^<>]*)>/g,
                    chalk.bold.cyanBright('$1')
                  );
                  return el.original;
                })
              )
          )
        );
      }, ms);
    });
  };
}

inquirer
  .prompt([
    {
      type: 'select-search',
      name: 'fruit-simple2',
      allowCustom: false,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: 'Banana',
      filterMethod: searchFood(false, 0),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val !== '' ? true : 'Type something!';
      },
      loop: true,
    },
    {
      type: 'select-search',
      name: 'fruit-simple',
      allowCustom: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: 'Banana',
      filterMethod: searchFood(false, 0),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val ? true : 'Type something!';
      },
      loop: true,
    },
    {
      type: 'select-search',
      name: 'fruit-simple',
      allowCustom: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      filterMethod: searchFood(false, 0),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val ? true : 'Type something!';
      },
      loop: true,
    },
    {
      type: 'multiple-select-search',
      name: 'fruit2',
      allowCustom: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: ['Banana', 'Kiwi'],
      filterMethod: searchFood(false),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val ? true : 'Type something!';
      },
      loop: true,
      debounceSearch: 2000,
    },
    {
      type: 'multiple-select-search',
      name: 'fruit',
      allowCustom: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: ['Banana', 'Kiwi'],
      filterMethod: searchFood(true),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val ? true : 'Type something!';
      },
      loop: false,
      reorderOnSelect: true,
    },
    {
      type: 'multiple-select-search',
      name: 'fruit3',
      allowCustom: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: ['Banana', 'Kiwi'],
      filterMethod: searchFood(false),
      choices: foods,
      pageSize: 4,
      validate: function (val) {
        return val ? true : 'Type something!';
      },
      loop: true,
    },
    {
      type: 'multiple-select-search',
      name: 'states',
      allowCustom: false,
      multiple: true,
      message: 'What is your favorite fruit?',
      searchText: 'We are searching the internet for you!',
      emptyText: 'Nothing found!',
      default: [2, 'Colorado', { value: 'Maryland' }],
      filterMethod: searchStates,
      choices: states,
      pageSize: 4,
      loop: false,
      reorderOnSelect: true,
    },
    {
      type: 'better-checkboxes',
      name: 'better-checkboxes',
      loop: true,
      choices: foods,
      pageSize: 4,
    },
    {
      type: 'checkbox',
      name: 'basiccheckbox',
      loop: true,
      choices: foods,
      pageSize: 4,
    },
  ])
  .then(function (answers) {
    console.log(JSON.stringify(answers, null, 2));
  });
