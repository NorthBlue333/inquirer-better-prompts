const Choice = require('inquirer/lib/objects/choice');

module.exports = class FilteredChoice extends Choice {
  constructor(originalChoice /*: Choice */, answers, originalIndex) {
    super(
      {
        name: originalChoice.name,
        value: originalChoice.value,
        short: originalChoice.short,
        disabled: originalChoice.disabled,
      },
      answers
    );

    this.checked = originalChoice.checked;

    this.originalIndex = originalIndex;
  }
};
