var Nanobus = require('nanobus')
var assert = require('assert')
var Parallelstate = require('./parallel-state')

module.exports = Nanostate

function Nanostate (initialState, transitions) {
  if (!(this instanceof Nanostate)) return new Nanostate(initialState, transitions)
  assert.equal(typeof initialState, 'string', 'nanostate: initialState should be type string')
  assert.equal(typeof transitions, 'object', 'nanostate: transitions should be type object')

  this.transitions = transitions
  this.state = initialState
  this.submachines = {}
  this._submachine = null
  this.guards = {}
  this.onchangecb = null;

  Nanobus.call(this)
}

Nanostate.prototype = Object.create(Nanobus.prototype)

Nanostate.prototype.constructor = Nanostate

Nanostate.prototype.onchange = function(cb) {
  this.onchangecb = cb;
}

Nanostate.prototype.guard = function (eventName, cb) {
  this.guards[eventName] = cb
}

Nanostate.prototype.emit = function (eventName) {
  var nextState = this._next(eventName)
  assert.ok(nextState, 'nanostate.emit: invalid transition' + this.state + '->' + eventName)

  if (this._submachine && Object.keys(this.transitions).indexOf(nextState) !== -1) {
    this._unregister()
  }

  if (this.guards[eventName] && (this.guards[eventName]() === false)) {
    return
  }
  this.state = nextState
  if (this.onchangecb !== null && typeof this.onchangecb === 'function') {
    this.onchangecb(nextState);
  }
  Nanobus.prototype.emit.call(this, nextState)
}

Nanostate.prototype.event = function (eventName, machine) {
  this.submachines[eventName] = machine
}

Nanostate.parallel = function (transitions) {
  return new Parallelstate(transitions)
}

Nanostate.prototype._unregister = function () {
  if (this._submachine) {
    this._submachine._unregister()
    this._submachine = null
  }
}

Nanostate.prototype._next = function (eventName) {
  if (this._submachine) {
    var nextState = this._submachine._next(eventName)
    if (nextState) {
      return nextState
    }
  }

  var submachine = this.submachines[eventName]
  if (submachine) {
    this._submachine = submachine
    return submachine.state
  }

  if (!Object.prototype.hasOwnProperty.call(this.transitions[this.state], eventName) &&
      Object.prototype.hasOwnProperty.call(this.transitions, '*')) {
    return this.transitions['*'][eventName]
  }

  return this.transitions[this.state][eventName]
}
