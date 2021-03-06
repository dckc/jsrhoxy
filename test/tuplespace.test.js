const { List } = require("immutable");
const rhoVM = require('../src/rhoVM.js');
const { evaluateInEnvironment } = require('../src/helpers.js');
const { nilAst, intAst, sendAst, send2Ast, forXAst, forXyAst } = require('./trees.js');

let vm;
beforeEach(() => {
  // Pure does not populate the standard registy and system ffi
  vm = rhoVM.pure();

  // This makes a standard working tuplespace
  //vm = rhoVM();
});

// Test Empty tuplespaces
test('Fresh Tuplespace', () => {
  expect(vm.isEmpty()).toBe(true);
});

test('Nil', () => {
  vm.deploy(nilAst, List([1,2,3]));
  expect(vm.isEmpty()).toBe(true);
});

// Test parring sends in
test('Par in one send', () => {
  vm.deploy(sendAst, List([1,2,3]));

  const concreteChan = evaluateInEnvironment(sendAst.chan, {});

  expect(vm.tuplespaceById().has(List([1,2,3]))).toBe(true);
  expect(vm.sendsByChan().has(concreteChan)).toBe(true);
  expect(vm.joinsByChan().count()).toEqual(0);
});

test('Par in same send twice', () => {
  vm.deploy(sendAst, List([1,2,3]));
  vm.deploy(sendAst, List([2,3,4]));

  expect(vm.tuplespaceById().has(List([1,2,3]))).toBe(true);
  expect(vm.tuplespaceById().has(List([2,3,4]))).toBe(true);
  expect(vm.joinsByChan().count()).toEqual(0);
});

test('Ensure value-equality semantics in tuplespace', () => {
  // First just make sure we can clone properly
  const sendClone = { ...sendAst };
  expect(sendClone === sendAst).toBe(false);

  // Deploy the clones
  vm.deploy(sendAst, List([1,2,3]));
  vm.deploy(sendClone, List([2,3,4]));

  // Build a concrete @Nil channel
  const concreteNil = evaluateInEnvironment(nilAst, {})

  // Assertions
  expect(vm.tuplespaceById().has(List([1,2,3]))).toBe(true);
  expect(vm.tuplespaceById().has(List([2,3,4]))).toBe(true);
  expect(vm.sendsByChan().get(concreteNil).size).toBe(2);
  expect(vm.joinsByChan().count()).toEqual(0);
})

test('Par in two different sends', () => {
  vm.deploy(sendAst, List([1,2,3]));
  vm.deploy(send2Ast, List([2,3,4]));

  expect(vm.tuplespaceById().count()).toEqual(2);
  expect(vm.sendsByChan().count()).toEqual(2);
  expect(vm.joinsByChan().count()).toEqual(0);
});

test('Par in one send, one ground', () => {
  vm.deploy(sendAst, List([1,2,3]));
  vm.deploy(intAst, List([2,3,4]));

  expect(vm.tuplespaceById().count()).toEqual(1);
  expect(vm.sendsByChan().count()).toEqual(1);
  expect(vm.joinsByChan().count()).toEqual(0);
});


// Test parring pars in
test('Par in a Par of two sends', () => {
  const parAst = {
    tag: "par",
    procs: [sendAst, sendAst],
  }

  vm.deploy(parAst, List([1,2,3]));

  expect(vm.tuplespaceById().count()).toEqual(2);
  expect(vm.sendsByChan().count()).toEqual(1);
  expect(vm.joinsByChan().count()).toEqual(0);
});

test('Par in a send inside a new', () => {
  const newSendAst = {
    tag: "new",
    vars: [{
      tag: "variable",
      givenName: "x",
    }],
    body: sendAst,
  }

  vm.deploy(newSendAst, List([1,2,3]));

  expect(vm.tuplespaceById().count()).toEqual(1);
  expect(vm.sendsByChan().count()).toEqual(1);
  expect(vm.joinsByChan().count()).toEqual(0);
});


// Test parring joins in
test('Par in a single-action join', () => {

  vm.deploy(forXAst, List([1,2,3]));

  expect(vm.tuplespaceById().count()).toEqual(1);
  expect(vm.sendsByChan().count()).toEqual(0);
  expect(vm.joinsByChan().count()).toEqual(1);
});


test('Par in a multi-action join', () => {

  vm.deploy(forXyAst, List([1,2,3]));

  expect(vm.tuplespaceById().count()).toEqual(1);
  expect(vm.sendsByChan().count()).toEqual(0);
  expect(vm.joinsByChan().count()).toEqual(2);
});

// Par in partially-overlapping joins
