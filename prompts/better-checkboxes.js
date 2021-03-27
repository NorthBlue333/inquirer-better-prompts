// @flow

/**
 * `autocomplete` type prompt
 */

var _ = {
  isNumber: require('lodash/isNumber'),
  isObject: require('lodash/isObject'),
  isString: require('lodash/isString'),
  isArray: require('lodash/isArray'),
  clone: require('lodash/clone'),
};

var chalk = require('chalk');
var figures = require('figures');
var CheckboxPrompt = require('inquirer/lib/prompts/checkbox');

class BetterCheckboxesPrompt extends CheckboxPrompt {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);
  }

  /**
   * Render the prompt to screen
   * @return {CheckboxPrompt} self
   */

  render(error) {
    // Render question
    var message = this.getQuestion();
    var bottomContent = '';

    if (!this.spaceKeyPressed) {
      message +=
        '(Press ' +
        chalk.cyan.bold('<space>') +
        ' to select, ' +
        chalk.cyan.bold('<a>') +
        ' to toggle all, ' +
        chalk.cyan.bold('<i>') +
        ' to invert selection)';
    }

    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      message += chalk.cyan(this.selection.join(', '));
    } else {
      var choicesStr = renderChoices(this.opt.choices, this.pointer);
      var indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.pointer)
      );
      var realIndexPosition =
        this.opt.choices.reduce(function (acc, value, i) {
          // Dont count lines past the choice we are looking at
          if (i > indexPosition) {
            return acc;
          }
          // Add line if it's a separator
          if (value.type === 'separator') {
            return acc + 1;
          }

          var l = value.name;
          // Non-strings take up one line
          if (typeof l !== 'string') {
            return acc + 1;
          }

          // Calculate lines taken up by string
          l = l.split('\n');
          return acc + l.length;
        }, 0) - 1;
      message +=
        '\n' +
        this.paginator.paginate(
          choicesStr,
          realIndexPosition,
          this.opt.pageSize
        );
    }

    if (error) {
      bottomContent = chalk.red('>> ') + error;
    }

    this.screen.render(message, bottomContent);
  }
}

/**
 * Function for rendering checkbox choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */

function renderChoices(choices, pointer) {
  var output = '';
  var separatorOffset = 0;

  choices.forEach(function (choice, i) {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += ' ' + choice + '\n';
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += ' - ' + choice.name;
      output +=
        ' (' +
        (_.isString(choice.disabled) ? choice.disabled : 'Disabled') +
        ')';
    } else {
      var line = getCheckbox(choice.checked) + ' ' + choice.name;
      if (i - separatorOffset === pointer) {
        output += chalk.cyan(figures.pointer + line);
      } else {
        output += ' ' + line;
      }
    }

    output += '\n';
  });

  return output.replace(/\n$/, '');
}

/**
 * Get the checkbox
 * @param  {Boolean} checked - add a X or not to the checkbox
 * @return {String} Composited checkbox string
 */

function getCheckbox(checked) {
  return ` ${checked ? chalk.green(figures.radioOn) : figures.radioOff}`;
}

module.exports = BetterCheckboxesPrompt;
