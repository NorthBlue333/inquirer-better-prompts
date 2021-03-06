/* eslint-env mocha */

var expect = require('chai').expect;
var sinon = require('sinon');
var inquirer = require('inquirer');
var ReadlineStub = require('../helpers/readline');
var Prompt = require('../../index');

describe('inquirer-autocomplete-prompt', function () {
  var source;
  var prompt;
  var resolve;
  var promise;
  var rl;
  var defaultChoices;
  var promiseForAnswer;

  describe('allowCustom = true', function () {
    beforeEach(function () {
      defaultChoices = ['foo', new inquirer.Separator(), 'bar', 'bum'];
      promise = new Promise(function (res) {
        resolve = res;
      });
      source = sinon.stub().returns(promise);

      rl = new ReadlineStub();
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          allowCustom: true,
          source: source,
        },
        rl
      );
    });

    it('applies filter', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            return val.slice(0, 2);
          },
          allowCustom: true,
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();

      type('banana');
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.equal('ba');
      });
    });

    it('applies filter async with done callback', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            var done = this.async();
            setTimeout(function () {
              done(null, val.slice(0, 2));
            }, 100);
          },
          allowCustom: true,
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();

      type('banana');
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.equal('ba');
      });
    });

    it('applies filter async with promise', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            return new Promise(function (resolve) {
              resolve(val.slice(0, 2));
            });
          },
          allowCustom: true,
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();

      type('banana');
      enter();

      return promiseForAnswer.then(function (answer) {
        expect(answer).to.equal('ba');
      });
    });

    describe('when tab pressed', function () {
      var promiseForAnswer;
      beforeEach(function () {
        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);
        return promise;
      });

      it('autocompletes the value selected in the list', function () {
        tab();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('foo');
        });
      });

      it('accepts any input', function () {
        type('banana');
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('banana');
        });
      });
    });

    describe('validation', function () {
      it('validates sync', function (done) {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              return false;
            },
            source: source,
            allowCustom: true,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        let hasCompleted = false;

        promise.then(function () {
          enter();

          setTimeout(() => {
            if (hasCompleted) {
              done(
                new Error(
                  'Prompt completed, but should have failed sync validation!.'
                )
              );
            } else {
              done();
            }
          }, 10);

          promiseForAnswer.then(function () {
            hasCompleted = true;
          });
        });
      });

      it('calls validate function correctly', function () {
        const validate = sinon.stub().returns(true);
        const answers = {};
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate,
            source: source,
            allowCustom: true,
          },
          rl,
          answers
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        return promise.then(function () {
          tab();
          enter();

          return promiseForAnswer.then(function () {
            sinon.assert.calledOnce(validate);
            sinon.assert.calledWithExactly(validate, 'foo', {});
          });
        });
      });

      it('validates async false', function (done) {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              let res;
              const promise = new Promise((resolve) => {
                res = resolve;
              });

              setTimeout(function () {
                res(false);
              }, 10);

              return promise;
            },
            source: source,
            allowCustom: true,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        let hasCompleted = false;

        promise.then(function () {
          enter();

          setTimeout(() => {
            if (hasCompleted) {
              done(
                new Error(
                  'Prompt completed, but should have failed async validation!.'
                )
              );
            } else {
              done();
            }
          }, 50);

          promiseForAnswer.then(function () {
            hasCompleted = true;
          });
        });
      });

      it('validates async true', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              let res;
              const promise = new Promise((resolve) => {
                res = resolve;
              });

              setTimeout(function () {
                res(true);
              }, 10);

              return promise;
            },
            source: source,
            allowCustom: true,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        return promise.then(function () {
          type('banana');
          enter();

          return promiseForAnswer.then(function (answer) {
            expect(answer).to.equal('banana');
          });
        });
      });
    });
  });

  describe('allowCustom = false', function () {
    beforeEach(function () {
      defaultChoices = ['foo', new inquirer.Separator(), 'bar', 'bum'];
      promise = new Promise(function (res) {
        resolve = res;
      });
      source = sinon.stub().returns(promise);

      rl = new ReadlineStub();
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          source: source,
        },
        rl
      );
    });

    describe('default behaviour', () => {
      it('sets the first to selected when no default', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            source: source,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve([9, 0, 'foo']);

        return promise.then(() => {
          enter();

          return promiseForAnswer.then((answer) => {
            expect(answer).to.equal(9);
          });
        });
      });

      it('set default value as selected when string', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            source: source,
            default: 'foo',
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve([1, 8, 'foo', 7, 3]);

        return promise.then(() => {
          enter();

          return promiseForAnswer.then((answer) => {
            expect(answer).to.equal('foo');
          });
        });
      });

      it('set default value as selected when number', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            source: source,
            default: 7,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(['foo', 1, 7, 3]);

        return promise.then(() => {
          enter();

          return promiseForAnswer.then((answer) => {
            expect(answer).to.equal(7);
          });
        });
      });

      it('set first default value as selected duplicates', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            source: source,
            default: 7,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(['foo', 1, 'foo', 3]);

        return promise.then(() => {
          moveDown();
          enter();

          return promiseForAnswer.then((answer) => {
            expect(answer).to.equal(1);
          });
        });
      });
    });

    it('applies filter', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            return val.slice(0, 2);
          },
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();
      resolve(defaultChoices);

      return promise.then(function () {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('ba');
        });
      });
    });

    it('applies filter async with done calback', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            var done = this.async();
            setTimeout(function () {
              done(null, val.slice(0, 2));
            }, 100);
          },
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();
      resolve(defaultChoices);

      return promise.then(function () {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('ba');
        });
      });
    });

    it('applies filter async with promise', function () {
      prompt = new Prompt(
        {
          message: 'test',
          name: 'name',
          filter: function (val) {
            return new Promise(function (resolve) {
              resolve(val.slice(0, 2));
            });
          },
          source: source,
        },
        rl
      );

      promiseForAnswer = getPromiseForAnswer();
      resolve(defaultChoices);

      return promise.then(function () {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('ba');
        });
      });
    });

    it('requires a name', function () {
      expect(function () {
        new Prompt({
          message: 'foo',
          source: source,
        });
      }).to.throw(/name/);
    });

    it('requires a source parameter', function () {
      expect(function () {
        new Prompt({
          name: 'foo',
          message: 'foo',
        });
      }).to.throw(/source/);
    });

    it('immediately calls source with undefined', function () {
      prompt.run();
      sinon.assert.calledOnce(source);
      sinon.assert.calledWithExactly(source, undefined, undefined);
    });

    describe('multiline choices', function () {
      var promiseForAnswer;
      beforeEach(function () {
        promiseForAnswer = getPromiseForAnswer();
        resolve([
          'foo',
          new inquirer.Separator(),
          'multiline\nline2\n\nline4',
          'bum',
        ]);
        return promise;
      });

      it('should select the correct multiline choice', function () {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('multiline\nline2\n\nline4');
        });
      });

      it('should skip over the multiline choice', function () {
        moveDown();
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('bum');
        });
      });
    });

    describe('mixed choices type', () => {
      var promiseForAnswer;
      beforeEach(function () {
        promiseForAnswer = getPromiseForAnswer();

        resolve([
          1234,
          'Option 2',
          {
            name: 'Option 3',
          },
          {
            value: 'Option 4',
          },
        ]);

        return promise;
      });

      it('supports number', () => {
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal(1234);
        });
      });

      it('supports string', () => {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('Option 2');
        });
      });

      it('supports object with no value, uses name for value', () => {
        moveDown();
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('Option 3');
        });
      });

      it('supports object with no name, uses value for name', () => {
        moveDown();
        moveDown();
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('Option 4');
        });
      });
    });

    describe('when it has full choices', () => {
      var promiseForAnswer;
      beforeEach(function () {
        promiseForAnswer = getPromiseForAnswer();

        resolve([
          {
            name: 'Option1',
            value: 1,
          },
          {
            name: 'Option2',
            value: 2,
            disabled: true,
          },
          {
            name: 'Option3',
            value: 3,
          },
          {
            name: 'Option4',
            value: 4,
            disabled: false,
          },
        ]);

        return promise;
      });

      it('can not select disabled choices', () => {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal(3);
        });
      });

      it('loops back correctly (accounts for disabled)', () => {
        moveDown();
        moveDown();
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal(1);
        });
      });
    });

    describe('when it has some results', function () {
      var promiseForAnswer;
      beforeEach(function () {
        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);
        return promise;
      });

      it('should move selected cursor on keypress', function () {
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('bar');
        });
      });

      it('should move selected cursor on ctrl n + p keypress', function () {
        moveDownCtrl();
        moveDownCtrl();
        moveUpCtrl();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('bar');
        });
      });

      it('moves up and down', function () {
        moveDown();
        moveDown();
        moveUp();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('bar');
        });
      });

      it('loops choices going down', function () {
        moveDown();
        moveDown();
        moveDown();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('foo');
        });
      });

      it('loops choices going up', function () {
        moveUp();
        enter();

        return promiseForAnswer.then(function (answer) {
          expect(answer).to.equal('bum');
        });
      });
    });

    describe('searching', function () {
      beforeEach(function () {
        prompt.run();
        source.reset();
        source.returns(promise);
      });

      it('searches after each char when user types', function () {
        type('a');
        sinon.assert.calledWithExactly(source, undefined, 'a');
        type('bba');
        sinon.assert.calledWithExactly(source, undefined, 'ab');
        sinon.assert.calledWithExactly(source, undefined, 'abb');
        sinon.assert.calledWithExactly(source, undefined, 'abba');
        sinon.assert.callCount(source, 4);
      });

      it('does not search again if same searchterm (not input added)', function () {
        type('ice');
        sinon.assert.calledThrice(source);
        source.reset();
        typeNonChar();
        sinon.assert.notCalled(source);
      });
    });

    describe('validation', function () {
      it('calls the validation function with the choice object', () => {
        const validate = sinon.stub().returns(true);
        const answers = {};
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate,
            source: source,
          },
          rl,
          answers
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        return promise.then(function () {
          enter();

          return promiseForAnswer.then(function () {
            sinon.assert.calledOnce(validate);
            sinon.assert.calledWithExactly(
              validate,
              sinon.match({
                disabled: undefined,
                name: 'foo',
                short: 'foo',
                value: 'foo',
              }),
              {}
            );
          });
        });
      });

      it('validates sync', function (done) {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              return false;
            },
            source: source,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        let hasCompleted = false;

        promise.then(function () {
          enter();

          setTimeout(() => {
            if (hasCompleted) {
              done(
                new Error(
                  'Prompt completed, but should have failed sync validation!.'
                )
              );
            } else {
              done();
            }
          }, 10);

          promiseForAnswer.then(function () {
            hasCompleted = true;
          });
        });
      });

      it('validates async false', function (done) {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              let res;
              const promise = new Promise((resolve) => {
                res = resolve;
              });

              setTimeout(function () {
                res(false);
              }, 10);

              return promise;
            },
            source: source,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        let hasCompleted = false;

        promise.then(function () {
          enter();

          setTimeout(() => {
            if (hasCompleted) {
              done(
                new Error(
                  'Prompt completed, but should have failed async validation!.'
                )
              );
            } else {
              done();
            }
          }, 50);

          promiseForAnswer.then(function () {
            hasCompleted = true;
          });
        });
      });

      it('validates async true', function () {
        prompt = new Prompt(
          {
            message: 'test',
            name: 'name',
            validate: function () {
              let res;
              const promise = new Promise((resolve) => {
                res = resolve;
              });

              setTimeout(function () {
                res(true);
              }, 10);

              return promise;
            },
            source: source,
          },
          rl
        );

        promiseForAnswer = getPromiseForAnswer();
        resolve(defaultChoices);

        return promise.then(function () {
          moveDown();
          enter();

          return promiseForAnswer.then(function (answer) {
            expect(answer).to.equal('bar');
          });
        });
      });
    });

    describe('submit', function () {
      describe('without choices in result', function () {
        beforeEach(function () {
          rl = new ReadlineStub();
          prompt = new Prompt(
            {
              message: 'test2',
              name: 'name2',
              source: source,
            },
            rl
          );
          prompt.run();

          resolve([]);
          return promise;
        });

        it('searches again, since not possible to select something that does not exist', function () {
          sinon.assert.calledOnce(source);
          enter();
          sinon.assert.calledTwice(source);
        });
      });

      describe('with allowCustom', function () {
        var answerValue = {};

        beforeEach(function () {
          promiseForAnswer = getPromiseForAnswer();
          resolve([
            {
              name: 'foo',
              value: answerValue,
              short: 'short',
            },
          ]);
          return promise;
        });

        it('selects the actual value typed');
      });

      describe('with choices', function () {
        var promiseForAnswer;
        var answerValue = {};

        beforeEach(function () {
          promiseForAnswer = getPromiseForAnswer();
          resolve([
            {
              name: 'foo',
              value: answerValue,
              short: 'short',
            },
          ]);
          return promise;
        });

        it('stores the value as the answer and status to answered', function () {
          enter();
          return promiseForAnswer.then(function (answer) {
            expect(answer).to.equal(answerValue);
            expect(prompt.answer).to.equal(answerValue);
            expect(prompt.shortAnswer).to.equal('short');
            expect(prompt.answerName).to.equal('foo');
            expect(prompt.status).to.equal('answered');
          });
        });

        describe('after selecting', function () {
          beforeEach(function () {
            enter();
            source.reset();
            return promiseForAnswer;
          });

          it('stops searching on typing', function () {
            type('test');
            sinon.assert.notCalled(source);
          });

          it('does not change answer on enter', function () {
            enter();
            sinon.assert.notCalled(source);
            return promiseForAnswer.then(function (answer) {
              expect(answer).to.equal(answerValue);
              expect(prompt.answer).to.equal(answerValue);
              expect(prompt.status).to.equal('answered');
            });
          });
        });
      });
    });
  });

  function getPromiseForAnswer() {
    return prompt.run();
  }

  function typeNonChar() {
    rl.input.emit('keypress', '', {
      name: 'shift',
    });
  }

  function type(word) {
    word.split('').forEach(function (char) {
      rl.line = rl.line + char;
      rl.input.emit('keypress', char);
    });
  }

  function moveDown() {
    rl.input.emit('keypress', '', {
      name: 'down',
    });
  }

  function moveDownCtrl() {
    rl.input.emit('keypress', '', {
      name: 'n',
      ctrl: true,
    });
  }

  function moveUpCtrl() {
    rl.input.emit('keypress', '', {
      name: 'p',
      ctrl: true,
    });
  }

  function moveUp() {
    rl.input.emit('keypress', '', {
      name: 'up',
    });
  }

  function enter() {
    rl.emit('line');
  }

  function tab() {
    rl.input.emit('keypress', '', {
      name: 'tab',
    });
  }
});
