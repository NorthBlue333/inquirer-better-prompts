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
var Choices = require('inquirer/lib/objects/choices');
var observe = require('inquirer/lib/utils/events');
var runAsync = require('run-async');
var { filter, takeUntil, map, debounceTime } = require('rxjs/operators');
const Choice = require('inquirer/lib/objects/choice');
const ListPrompt = require('inquirer/lib/prompts/list');

class SelectSearchPrompt extends ListPrompt {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    // Set defaults prompt options
    var def = _.clone(questions.default);

    // If def is a Number, then use as index. Otherwise, check for value.
    if (_.isNumber(def) && def >= 0 && def < this.opt.choices.realLength) {
      this.toggleChoice(def, false, true);
    } else if (_.isString(def) || _.isObject(def)) {
      var existingChoice = this.opt.choices.realChoices.findIndex(
        (choice) =>
          def === choice ||
          def === choice.value ||
          def.value === choice ||
          def.value === choice.value
      );

      if (existingChoice >= 0) {
        this.selected = existingChoice;
      } else if (this.allowCustom === true) {
        const newChoice = new Choice(def, answers);
        newChoice.checked = true;
        this.opt.choices = new Choices(
          this.opt.choices.choices.concat([newChoice])
        );
      }
    }
    if (this.opt.reorderOnSelect) {
      this.reorderChoices();
    }

    this.onNewSearch();
    this.initialPageSize = this.opt.pageSize || 7;
    this.setCurrentValue();
    this.firstKeyPressed = false;
  }

  setCurrentChoice() {
    if (!this.filteredChoices) {
      this.currentChoice = this.opt.choices.getChoice(this.selected);
      return;
    }
    const filteredChoice = this.filteredChoices.getChoice(this.selected);
    if (!filteredChoice) {
      this.currentChoice = null;
      return;
    }
    this.currentChoice = this.opt.choices.getChoice(
      filteredChoice.originalIndex
    );
  }

  setCurrentValue() {
    this.setCurrentChoice();
    if (this.opt.allowCustom) {
      this.currentValue = this.rl.line;
      return;
    }
    this.currentValue = this.currentChoice ? this.currentChoice.value : '';
  }

  getCurrentValue() {
    return this.currentValue;
  }

  _run(cb) {
    this.done = cb;

    var events = observe(this.rl);

    var validation = this.handleSubmitEvents(
      events.line
        .pipe(filter(() => this.status === 'pending'))
        .pipe(map(this.getCurrentValue.bind(this)))
    );
    validation.success.forEach(this.onEnd.bind(this));
    validation.error.forEach(this.onError.bind(this));

    // we need to have access to k and j
    // events.normalizedUpKey
    //   .pipe(takeUntil(validation.success))
    //   .forEach(this.onUpKey.bind(this));
    // events.normalizedDownKey
    //   .pipe(takeUntil(validation.success))
    //   .forEach(this.onDownKey.bind(this));

    events.keypress
      .pipe(
        filter(({ key }) => key.name === 'up' || (key.name === 'p' && key.ctrl))
      )
      .pipe(takeUntil(validation.success))
      .forEach(this.onUpKey.bind(this));

    events.keypress
      .pipe(
        filter(
          ({ key }) => key.name === 'down' || (key.name === 'n' && key.ctrl)
        )
      )
      .pipe(takeUntil(validation.success))
      .forEach(this.onDownKey.bind(this));

    events.keypress
      .pipe(filter(({ key }) => key.name === 'tab'))
      .pipe(takeUntil(validation.success))
      .forEach(this.onTabKey.bind(this));

    let keyPressedEvent = events.keypress
      .pipe(
        filter(
          ({ key }) =>
            key.name !== 'up' &&
            !(key.name === 'p' && key.ctrl) &&
            key.name !== 'down' &&
            !(key.name === 'n' && key.ctrl) &&
            key.name !== 'tab'
        )
      )
      .pipe(takeUntil(validation.success));
    keyPressedEvent.forEach(this.render.bind(this));

    if (this.opt.debounceSearch) {
      keyPressedEvent = keyPressedEvent.pipe(
        debounceTime(this.opt.debounceSearch)
      );
    }

    keyPressedEvent.forEach(this.onNewSearch.bind(this));

    this.render();

    return this;
  }

  /**
   * Render the prompt to screen
   * @return {CheckboxPrompt} self
   */

  render(error) {
    // Render question
    var message = this.getQuestion();
    var bottomContent = '';

    if (!this.firstKeyPressed) {
      message += chalk.dim(
        `(Press ${chalk.cyan.bold('<enter>')} to confirm ${
          this.opt.allowCustom ? 'your input' : 'your selection'
        }${
          this.opt.allowCustom
            ? `, ${chalk.cyan.bold('<tab>')} to autocomplete`
            : ''
        })`
      );
    }

    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      message += chalk.cyan(this.getCurrentValue());
    } else if (this.status === 'searching') {
      message += this.rl.line;
      message += '\n' + chalk.yellow(this.opt.searchText || 'Searching...');
    } else {
      message += this.rl.line;
      var choicesStr = listRender(
        this.filteredChoices || this.opt.choices,
        this.selected
      );
      var indexPosition = this.opt.choices.indexOf(
        this.opt.choices.getChoice(this.selected)
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
      bottomContent += chalk`\n{dim Current choice : }${chalk.cyan(
        this.getCurrentValue()
      )}\n `;
      if (this.filteredChoices && this.filteredChoices.realLength === 0) {
        bottomContent += `\n${chalk.yellow(
          this.opt.emptyText || 'No results'
        )}`;
      } else {
        bottomContent +=
          '\n' +
          this.paginator.paginate(
            choicesStr,
            realIndexPosition,
            this.opt.pageSize
          );
      }
    }

    if (_.isString(error)) {
      bottomContent += chalk.red('\n>> ') + chalk.redBright(error);
    }

    this.screen.render(message, bottomContent);
  }

  onUpKey() {
    this.firstKeyPressed = true;
    this.selected = incrementListIndex(
      this.selected,
      'up',
      this.opt,
      this.filteredChoices
    );
    this.setCurrentValue();
    this.render();
  }

  onDownKey() {
    this.firstKeyPressed = true;
    this.selected = incrementListIndex(
      this.selected,
      'down',
      this.opt,
      this.filteredChoices
    );
    this.setCurrentValue();
    this.render();
  }

  onTabKey() {
    this.firstKeyPressed = true;
    let currentLine = this.rl.line.trim();
    let error;
    if (this.status === 'pending') {
      currentLine = this.currentChoice ? this.currentChoice.value : currentLine;
    }
    this.rl.clearLine();
    this.rl.write(currentLine);
    this.onNewSearch();
    this.render(error);
  }

  onNewSearch(e) {
    if (e) {
      this.firstKeyPressed = true;
    }
    this.status = 'searching';
    var asyncSearch = runAsync(this.opt.filterMethod);
    var self = this;
    const newPromise = asyncSearch(
      this.opt.choices,
      this.answers,
      this.rl.line
    );
    self.currentPromise = newPromise;

    newPromise.then((results) => {
      // ignore result if it is not the one we are waiting for
      if (self.currentPromise !== newPromise) return;
      self.filteredChoices = results;
      this.resetPointer();
      this.setCurrentValue();
      this.status = 'pending';
      this.render();
    });
    this.render();
  }

  /**
   * When user press `enter` key
   */

  onEnd(state) {
    this.status = 'answered';
    this.firstKeyPressed = true;
    // Rerender prompt (and clean subline error)
    this.render();

    this.screen.done();
    this.done(state.value);
  }

  onError(state) {
    this.render(state.isValid);
  }

  resetPointer() {
    this.selected = Math.max(
      Math.min(
        (this.filteredChoices
          ? this.filteredChoices.realLength
          : this.opt.choices.realLength) - 1,
        this.selected
      ),
      0
    );
  }
}

/**
 * Function for rendering list choices
 * @param  {Number} pointer Position of the pointer
 * @return {String}         Rendered content
 */
function listRender(choices, pointer) {
  var output = '';
  var separatorOffset = 0;

  choices.forEach((choice, i) => {
    if (choice.type === 'separator') {
      separatorOffset++;
      output += '  ' + choice + '\n';
      return;
    }

    if (choice.disabled) {
      separatorOffset++;
      output += '  - ' + choice.name;
      output +=
        ' (' +
        (_.isString(choice.disabled) ? choice.disabled : 'Disabled') +
        ')';
      output += '\n';
      return;
    }

    var isSelected = i - separatorOffset === pointer;
    var line = (isSelected ? figures.pointer + ' ' : '  ') + choice.name;
    if (isSelected) {
      line = chalk.cyan(line);
    }

    output += line + ' \n';
  });

  return output.replace(/\n$/, '');
}

function incrementListIndex(current, dir, opt, filtered) {
  var len = filtered ? filtered.realLength : opt.choices.realLength;
  var shouldLoop = 'loop' in opt ? Boolean(opt.loop) : true;
  if (dir === 'up') {
    if (current > 0) {
      return current - 1;
    }
    return shouldLoop ? len - 1 : current;
  }
  if (dir === 'down') {
    if (current < len - 1) {
      return current + 1;
    }
    return shouldLoop ? 0 : current;
  }
  throw new Error('dir must be up or down');
}

module.exports = SelectSearchPrompt;
