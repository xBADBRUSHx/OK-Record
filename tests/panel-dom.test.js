const assert = require("assert");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const panelDom = require(path.join(repoRoot, "uxp", "panel-dom.js"));
const { MockDocument, MockEvent, hasClass, textOf } = require("./helpers/mock-dom");

function installMockDom() {
  const document = new MockDocument();
  const timers = [];
  global.document = document;
  global.Event = MockEvent;
  global.setTimeout = (callback) => {
    timers.push(callback);
    return timers.length;
  };
  return {
    document,
    flushTimers() {
      while (timers.length > 0) {
        timers.shift()();
      }
    },
  };
}

function testStructuralHelpers() {
  installMockDom();

  const parent = document.createElement("div");
  const first = document.createElement("span");
  const second = document.createElement("span");
  assert.strictEqual(panelDom.appendChildren(parent, [first, second]), parent);
  assert.deepStrictEqual(parent.children, [first, second]);
  panelDom.clearChildren(parent);
  assert.strictEqual(parent.children.length, 0, "clearChildren must remove all children");

  const spacer = panelDom.createSpacer("ok-record-field-label-gap");
  assert.strictEqual(spacer.tagName, "SPAN");
  assert(hasClass(spacer, "ok-record-field-label-gap"));
  assert.strictEqual(spacer.getAttribute("aria-hidden"), "true");

  const sectionGap = panelDom.createPanelSectionGap();
  assert.strictEqual(sectionGap.tagName, "DIV");
  assert(hasClass(sectionGap, "ok-record-panel-section-gap"));
}

function testFieldHelpers() {
  installMockDom();

  const secondField = panelDom.createSecondField({
    label: "采样间隔",
    value: 30,
    min: 1,
    max: 3600,
    step: 1,
  });
  assert(hasClass(secondField.field, "ok-record-field"));
  assert.strictEqual(textOf(secondField.field.querySelector(".ok-record-field-label")), "采样间隔");
  assert.strictEqual(secondField.input.value, "30");
  assert.strictEqual(secondField.input.getAttribute("role"), "spinbutton");
  assert.strictEqual(secondField.input.getAttribute("aria-valuemin"), "1");
  assert.strictEqual(secondField.input.getAttribute("aria-valuemax"), "3600");
  assert.strictEqual(secondField.input.getAttribute("aria-valuenow"), "30");
  assert.strictEqual(textOf(secondField.field.querySelector(".ok-record-unit-label")), "秒");

  const durationField = panelDom.createMinuteSecondField({
    label: "视频时长",
    parts: { minutes: 2, seconds: 3.5 },
    minuteMax: 60,
    secondMax: 59.999,
    secondStep: 0.1,
  });
  assert.strictEqual(textOf(durationField.field.querySelector(".ok-record-field-label")), "视频时长");
  assert.strictEqual(durationField.minutesInput.value, "2");
  assert.strictEqual(durationField.secondsInput.value, "3.5");
  assert.deepStrictEqual(durationField.field.querySelectorAll(".ok-record-unit-label").map(textOf), ["分", "秒"]);
}

function testSelectAndGroupHelpers() {
  installMockDom();

  let changed = 0;
  const select = panelDom.createPresetSelect({
    title: "质量",
    value: "default",
    options: [
      { id: "low", label: "低" },
      { id: "default", label: "默认" },
    ],
    onChange: () => {
      changed += 1;
    },
  });
  assert.strictEqual(select.tagName, "SELECT");
  assert.strictEqual(select.title, "质量");
  assert.strictEqual(select.getAttribute("aria-label"), "质量");
  assert.strictEqual(select.value, "default");
  assert.deepStrictEqual(select.children.map((option) => option.value), ["low", "default"]);
  assert.deepStrictEqual(select.children.map(textOf), ["低", "默认"]);
  select.dispatchEvent(new MockEvent("change"));
  assert.strictEqual(changed, 1);

  const inline = panelDom.createInlineSelectControl("分辨率", select);
  assert.strictEqual(inline.tagName, "LABEL");
  assert(hasClass(inline, "ok-record-quality-option"));
  assert.strictEqual(textOf(inline.querySelector(".ok-record-quality-option-label")), "分辨率");
  assert(hasClass(inline.querySelector(".ok-record-quality-option-gap"), "ok-record-quality-option-gap"));

  const child = document.createElement("button");
  const titledGroup = panelDom.createPanelGroup("录制设置", [child]);
  assert.strictEqual(titledGroup.tagName, "SECTION");
  assert.strictEqual(textOf(titledGroup.querySelector(".ok-record-group-title-text")), "录制设置");
  assert.strictEqual(titledGroup.querySelectorAll(".ok-record-group-title-rule").length, 2);
  assert.strictEqual(titledGroup.querySelectorAll(".ok-record-group-title-rule")[0].getAttribute("aria-hidden"), "true");
  assert(titledGroup.querySelector(".ok-record-group-body"), "group must render a body node");

  const untitledGroup = panelDom.createPanelGroup("", [document.createElement("div")], { showTitle: false });
  assert.strictEqual(untitledGroup.querySelector(".ok-record-group-title"), null);
  assert(untitledGroup.querySelector(".ok-record-group-body"), "untitled group must still render a body node");
}

function testButtonHelpers() {
  installMockDom();

  let clicks = 0;
  const button = panelDom.createButton("导出视频", () => {
    clicks += 1;
  });
  assert.strictEqual(button.tagName, "BUTTON");
  assert.strictEqual(textOf(button), "导出视频");
  assert(hasClass(button.querySelector(".ok-record-button-label"), "ok-record-button-label"));
  button.dispatchEvent(new MockEvent("click"));
  assert.strictEqual(clicks, 1);

  panelDom.setButtonLabel(button, "打开导出目录");
  assert.strictEqual(button.querySelectorAll(".ok-record-button-label").length, 1);
  assert.strictEqual(textOf(button), "打开导出目录");

  panelDom.setButtonTextMetrics(button, "16px", "22px");
  assert.strictEqual(button.style.fontSize, "16px");
  assert.strictEqual(button.style.lineHeight, "22px");
  assert.strictEqual(button.querySelector(".ok-record-button-label").style.fontSize, "16px");
  assert.strictEqual(button.querySelector(".ok-record-button-label").style.lineHeight, "22px");

  let controlRuns = 0;
  const control = panelDom.createControlButton("开始录制", () => {
    controlRuns += 1;
  }, "ok-record-record-status-button");
  assert.strictEqual(control.tagName, "DIV");
  assert(hasClass(control, "ok-record-control-button"));
  assert(hasClass(control, "ok-record-record-status-button"));
  assert.strictEqual(control.getAttribute("role"), "button");
  assert.strictEqual(control.getAttribute("tabindex"), "0");

  control.dispatchEvent(new MockEvent("click"));
  control.dispatchEvent(new MockEvent("keydown", { key: "Enter" }));
  const spaceEvent = new MockEvent("keydown", { key: " " });
  control.dispatchEvent(spaceEvent);
  assert.strictEqual(controlRuns, 3);
  assert.strictEqual(spaceEvent.defaultPrevented, true);

  panelDom.setControlDisabled(control, true);
  assert.strictEqual(control.disabled, true);
  assert.strictEqual(control.getAttribute("aria-disabled"), "true");
  assert.strictEqual(control.getAttribute("tabindex"), "-1");
  assert(hasClass(control, "ok-record-control-disabled"));
  control.dispatchEvent(new MockEvent("click"));
  assert.strictEqual(controlRuns, 3, "disabled control button must not run click handlers");

  panelDom.setControlDisabled(control, false);
  assert.strictEqual(control.disabled, false);
  assert.strictEqual(control.getAttribute("aria-disabled"), "false");
  assert.strictEqual(control.getAttribute("tabindex"), "0");
  assert(!hasClass(control, "ok-record-control-disabled"));
}

function testNumericEditor() {
  const { flushTimers } = installMockDom();
  const events = [];
  const field = panelDom.createSecondField({
    label: "每帧停留",
    value: 1.25,
    min: 0.001,
    max: 3600,
    step: 0.001,
    onInput: () => events.push("input"),
    onChange: () => events.push("change"),
  });

  const control = field.input;
  assert(hasClass(control, "ok-record-number-input"));
  assert(hasClass(control, "ok-record-short-number"));
  assert.strictEqual(textOf(control.querySelector(".ok-record-number-value")), "1.25");
  assert.strictEqual(control.getAttribute("aria-valuenow"), "1.25");
  assert.strictEqual(control.getAttribute("aria-valuetext"), null);

  control.dispatchEvent(new MockEvent("click"));
  flushTimers();
  assert(hasClass(control, "ok-record-number-editing"));
  assert.strictEqual(control.querySelector(".ok-record-number-value").style.display, "none");
  let editor = control.querySelector("input");
  assert(editor, "numeric editor must create a transient text input while editing");
  assert.strictEqual(editor.type, "text");
  assert.strictEqual(editor.inputMode, "decimal");
  assert.strictEqual(editor.getAttribute("inputmode"), "decimal");
  assert.strictEqual(editor.min, "0.001");
  assert.strictEqual(editor.max, "3600");
  assert.strictEqual(editor.step, "0.001");
  assert.strictEqual(editor.style.textAlign, "right");

  editor.value = "2.5";
  editor.dispatchEvent(new MockEvent("input"));
  assert.strictEqual(control.value, "2.5");
  assert.strictEqual(control.getAttribute("aria-valuenow"), "2.5");
  assert.deepStrictEqual(events, ["input"]);

  editor.dispatchEvent(new MockEvent("blur"));
  assert.strictEqual(control.querySelector("input"), null);
  assert(!hasClass(control, "ok-record-number-editing"));
  assert.strictEqual(control.querySelector(".ok-record-number-value").style.display, "");
  assert.deepStrictEqual(events, ["input", "change"]);

  control.dispatchEvent(new MockEvent("click"));
  flushTimers();
  editor = control.querySelector("input");
  editor.value = "9";
  editor.dispatchEvent(new MockEvent("input"));
  editor.dispatchEvent(new MockEvent("keydown", { key: "Escape" }));
  assert.strictEqual(control.value, "2.5", "Escape must restore the value from before editing");
  assert.strictEqual(control.querySelector("input"), null);
}

function testNumericDisabledState() {
  installMockDom();
  const field = panelDom.createSecondField({
    label: "空闲暂停计时",
    value: 300,
    min: 1,
    max: 86400,
    step: 0.1,
  });
  const control = field.input;

  control.disabled = true;
  assert(hasClass(control, "ok-record-number-disabled"));
  assert.strictEqual(control.getAttribute("aria-disabled"), "true");
  assert.strictEqual(control.tabIndex, -1);
  control.dispatchEvent(new MockEvent("click"));
  assert.strictEqual(control.querySelector("input"), null, "disabled numeric editor must not enter edit mode");

  control.disabled = false;
  assert(!hasClass(control, "ok-record-number-disabled"));
  assert.strictEqual(control.getAttribute("aria-disabled"), "false");
  assert.strictEqual(control.tabIndex, 0);
}

testStructuralHelpers();
testFieldHelpers();
testSelectAndGroupHelpers();
testButtonHelpers();
testNumericEditor();
testNumericDisabledState();
