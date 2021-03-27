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
var Choices = require('inquirer/lib/objects/choices');
var Separator = require('inquirer/lib/objects//separator');
var observe = require('inquirer/lib/utils/events');
var runAsync = require('run-async');
var { filter, takeUntil, map, debounceTime } = require('rxjs/operators');
const Choice = require('inquirer/lib/objects/choice');

class MultipleSelectSearchPrompt extends CheckboxPrompt {
  constructor(questions, rl, answers) {
    super(questions, rl, answers);

    // Set defaults prompt options
    var originalDefault = _.clone(questions.default);

    var def = _.isArray(originalDefault) ? originalDefault : [originalDefault];
    def.forEach(function (defaultChoice) {
      // If def is a Number, then use as index. Otherwise, check for value.
      if (
        _.isNumber(defaultChoice) &&
        defaultChoice >= 0 &&
        defaultChoice < this.opt.choices.realLength
      ) {
        this.toggleChoice(defaultChoice, false, true);
      } else if (_.isString(defaultChoice) || _.isObject(defaultChoice)) {
        var existingChoice = this.opt.choices.realChoices.findIndex(
          (choice) =>
            defaultChoice === choice ||
            defaultChoice === choice.value ||
            defaultChoice.value === choice ||
            defaultChoice.value === choice.value
        );

        if (existingChoice >= 0) {
          this.toggleChoice(existingChoice, false, true);
        } else if (this.allowCustom === true) {
          const newChoice = new Choice(defaultChoice, answers);
          newChoice.checked = true;
          this.opt.choices = new Choices(
            this.opt.choices.choices.concat([newChoice])
          );
        }
      }
    }, this);
    if (this.opt.reorderOnSelect) {
      this.reorderChoices();
    }

    this.onNewSearch();
    this.initialPageSize = this.opt.pageSize || 7;
  }

  getCurrentChoices() {
    return this.opt.choices.filter((choice) => {
      return Boolean(choice.checked) && !choice.disabled;
    });
  }

  getCurrentChoiceToString() {
    this.getCurrentValue();
    return this.selection.join(this.getChoiceSeparator());
  }

  getChoiceSeparator() {
    return this.opt.choiceSeparator || ' ';
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

    // Init the prompt
    this.render();
    this.firstRender = false;

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

    if (!this.spaceKeyPressed) {
      message += chalk.dim(
        `(Press ${chalk.cyan.bold('<tab>')} to select${
          this.opt.allowCustom
            ? `, ${chalk.cyan.bold('<shift+tab>')} to add your current input`
            : ''
        })`
      );
    }

    // Render choices or answer depending on the state
    if (this.status === 'answered') {
      message += chalk.cyan(this.getCurrentChoiceToString());
    } else if (this.status === 'searching') {
      message += this.rl.line;
      message += '\n' + chalk.yellow(this.opt.searchText || 'Searching...');
    } else {
      message += this.rl.line;
      var choicesStr = renderChoices(
        this.filteredChoices || this.opt.choices,
        this.pointer
      );
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
      bottomContent += chalk`\n{dim Current choice : }${chalk.cyan(
        this.getCurrentChoiceToString()
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
    this.pointer = incrementListIndex(
      this.pointer,
      'up',
      this.opt,
      this.filteredChoices
    );
    this.render();
  }

  onDownKey() {
    this.pointer = incrementListIndex(
      this.pointer,
      'down',
      this.opt,
      this.filteredChoices
    );
    this.render();
  }

  onTabKey(e) {
    let currentLine = this.rl.line.trim();
    let error;
    if (this.status === 'pending') {
      if (e.key.shift) {
        if (!this.opt.allowCustom) {
          error = 'Choosing a custom value is not allowed.';
        } else {
          const newChoice = new Choice(currentLine);
          newChoice.checked = true;
          currentLine = '';

          this.opt.choices = new Choices(
            this.opt.choices.choices.concat(newChoice),
            this.answers
          );
          if (this.opt.reorderOnSelect) {
            this.reorderChoices();
          } else {
            this.pointer = this.opt.choices.realLength - 1;
          }
        }
      } else {
        super.onSpaceKey();
      }
    }
    this.rl.clearLine();
    this.rl.write(currentLine);
    this.onNewSearch();
    this.render(error);
  }

  onNewSearch() {
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
      this.status = 'pending';
      this.render();
    });
    this.render();
  }

  resetPointer() {
    if (!this.opt.reorderOnSelect) {
      this.pointer = Math.min(
        (this.filteredChoices
          ? this.filteredChoices.realLength
          : this.opt.choices.realLength) - 1,
        this.pointer
      );
      return;
    }
    this.pointer = Math.min(
      this.getCurrentChoices().length,
      this.opt.choices.realLength - 1
    );
  }

  toggleChoice(index, shouldReorder = true, force = undefined) {
    var item = this.filteredChoices
      ? this.filteredChoices.getChoice(index)
      : this.opt.choices.getChoice(index);
    if (item !== undefined) {
      this.opt.choices.getChoice(
        this.filteredChoices ? item.originalIndex : index
      ).checked = force !== undefined ? force : !item.checked;
      if (this.opt.reorderOnSelect && shouldReorder) {
        this.reorderChoices();
      }
      this.onNewSearch();
    }
  }

  reorderChoices() {
    const newChoices = this.opt.choices.realChoices.sort((a, b) =>
      a.checked === true ? (b.checked === true ? 0 : -1) : 1
    );
    const lastCheckedIndex = newChoices.reduce(
      (acc, choice, index) => (choice.checked ? index : acc),
      -1
    );
    if (lastCheckedIndex >= 0 && lastCheckedIndex < newChoices.length - 1) {
      newChoices.splice(lastCheckedIndex + 1, 0, new Separator());
    }
    this.opt.choices = new Choices(newChoices);
    this.opt.pageSize = lastCheckedIndex + 1 + this.initialPageSize;
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

module.exports = MultipleSelectSearchPrompt;
