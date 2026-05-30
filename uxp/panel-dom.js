"use strict";

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function appendChildren(parent, children) {
  for (const child of children) {
    parent.appendChild(child);
  }
  return parent;
}

function createSpacer(className, tagName = "span") {
  const spacer = document.createElement(tagName);
  spacer.className = className;
  spacer.setAttribute("aria-hidden", "true");
  return spacer;
}

function intersperseWithSpacer(nodes, spacerClassName) {
  const spacedNodes = [];
  nodes.forEach((node, index) => {
    if (index > 0) {
      spacedNodes.push(createSpacer(spacerClassName));
    }
    spacedNodes.push(node);
  });
  return spacedNodes;
}

function createPanelSectionGap() {
  return createSpacer("ok-record-panel-section-gap", "div");
}

function createFieldContainer(tagName = "div") {
  const field = document.createElement(tagName);
  field.className = "ok-record-field";
  return field;
}

function createFieldLabel(label) {
  const fieldLabel = document.createElement("div");
  fieldLabel.className = "ok-record-field-label";
  fieldLabel.textContent = label;
  return fieldLabel;
}

function createUnitLabel(label) {
  const unit = document.createElement("span");
  unit.className = "ok-record-unit-label";
  unit.textContent = label;
  return unit;
}

function createNumericEditor({ className = "", min, max, step, value, onInput, onChange }) {
  const control = document.createElement("div");
  const valueNode = document.createElement("span");
  let currentValue = String(value);
  let minValue = String(min);
  let maxValue = String(max);
  let stepValue = String(step);
  let disabled = false;
  let editInput = null;
  let editingStartValue = currentValue;

  control.className = ["ok-record-number-input", className].filter(Boolean).join(" ");
  control.setAttribute("role", "spinbutton");
  control.setAttribute("tabindex", "0");
  control.setAttribute("aria-valuemin", minValue);
  control.setAttribute("aria-valuemax", maxValue);

  valueNode.className = "ok-record-number-value";
  control.appendChild(valueNode);

  function syncValueDisplay() {
    valueNode.textContent = currentValue;
    const numericValue = Number(currentValue);
    if (Number.isFinite(numericValue)) {
      control.setAttribute("aria-valuenow", String(numericValue));
      control.removeAttribute("aria-valuetext");
    } else {
      control.removeAttribute("aria-valuenow");
      control.setAttribute("aria-valuetext", currentValue);
    }
    if (editInput && editInput.value !== currentValue) {
      editInput.value = currentValue;
    }
  }

  function dispatchNumericEvent(type) {
    control.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function finishEditing(commit) {
    if (!editInput) {
      return;
    }
    const input = editInput;
    editInput = null;
    if (commit) {
      currentValue = input.value;
    } else {
      currentValue = editingStartValue;
    }
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
    valueNode.style.display = "";
    control.classList.remove("ok-record-number-editing");
    syncValueDisplay();
    if (commit) {
      dispatchNumericEvent("change");
    }
  }

  function beginEditing() {
    if (disabled || editInput) {
      return;
    }
    editingStartValue = currentValue;
    editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "ok-record-number-editor-input";
    editInput.inputMode = "decimal";
    editInput.setAttribute("inputmode", "decimal");
    editInput.min = minValue;
    editInput.max = maxValue;
    editInput.step = stepValue;
    editInput.value = currentValue;
    editInput.style.textAlign = "right";
    editInput.addEventListener("input", () => {
      currentValue = editInput.value;
      syncValueDisplay();
      dispatchNumericEvent("input");
    });
    editInput.addEventListener("blur", () => {
      finishEditing(true);
    });
    editInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishEditing(true);
        control.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        finishEditing(false);
        control.focus();
      }
    });

    valueNode.style.display = "none";
    control.classList.add("ok-record-number-editing");
    control.appendChild(editInput);
    setTimeout(() => {
      if (editInput) {
        editInput.focus();
        if (typeof editInput.select === "function") {
          editInput.select();
        }
      }
    }, 0);
  }

  Object.defineProperty(control, "value", {
    get() {
      return currentValue;
    },
    set(nextValue) {
      currentValue = String(nextValue);
      syncValueDisplay();
    },
  });
  Object.defineProperty(control, "min", {
    get() {
      return minValue;
    },
    set(nextValue) {
      minValue = String(nextValue);
      control.setAttribute("aria-valuemin", minValue);
      if (editInput) {
        editInput.min = minValue;
      }
    },
  });
  Object.defineProperty(control, "max", {
    get() {
      return maxValue;
    },
    set(nextValue) {
      maxValue = String(nextValue);
      control.setAttribute("aria-valuemax", maxValue);
      if (editInput) {
        editInput.max = maxValue;
      }
    },
  });
  Object.defineProperty(control, "step", {
    get() {
      return stepValue;
    },
    set(nextValue) {
      stepValue = String(nextValue);
      if (editInput) {
        editInput.step = stepValue;
      }
    },
  });
  Object.defineProperty(control, "disabled", {
    get() {
      return disabled;
    },
    set(nextValue) {
      disabled = Boolean(nextValue);
      if (disabled) {
        finishEditing(true);
      }
      control.classList.toggle("ok-record-number-disabled", disabled);
      control.setAttribute("aria-disabled", String(disabled));
      control.tabIndex = disabled ? -1 : 0;
    },
  });

  control.addEventListener("click", () => {
    beginEditing();
  });
  control.addEventListener("keydown", (event) => {
    if (event.target !== control) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      beginEditing();
    }
  });
  if (onInput) {
    control.addEventListener("input", onInput);
  }
  if (onChange) {
    control.addEventListener("change", onChange);
  }

  syncValueDisplay();
  return control;
}

function createMinuteSecondField({ label, parts, minuteMax, secondMax, secondStep, onInput, onChange }) {
  const field = createFieldContainer();
  const fieldLabel = createFieldLabel(label);
  const minutesInput = createNumericEditor({
    className: "ok-record-short-number",
    min: 0,
    max: minuteMax,
    step: 1,
    value: parts.minutes,
    onInput,
    onChange,
  });
  const secondsInput = createNumericEditor({
    className: "ok-record-short-number",
    min: 0,
    max: secondMax,
    step: secondStep,
    value: parts.seconds,
    onInput,
    onChange,
  });

  appendFieldControls(field, fieldLabel, [
    minutesInput,
    createUnitLabel("分"),
    secondsInput,
    createUnitLabel("秒"),
  ]);
  return { field, minutesInput, secondsInput };
}

function createSecondField({ label, value, min, max, step, onInput, onChange }) {
  const field = createFieldContainer();
  const fieldLabel = createFieldLabel(label);
  const input = createNumericEditor({
    className: "ok-record-short-number",
    min,
    max,
    step,
    value,
    onInput,
    onChange,
  });

  appendFieldControls(field, fieldLabel, [input, createUnitLabel("秒")]);
  return { field, input };
}

function createInlineSelectControl(label, select) {
  const control = document.createElement("label");
  control.className = "ok-record-quality-option";

  const text = document.createElement("span");
  text.className = "ok-record-quality-option-label";
  text.textContent = label;

  appendChildren(control, [
    text,
    createSpacer("ok-record-quality-option-gap"),
    select,
  ]);
  return control;
}

function createPresetSelect({ title, options, value, onChange }) {
  const select = document.createElement("select");
  select.title = title;
  select.setAttribute("aria-label", title);
  for (const option of options) {
    const item = document.createElement("option");
    item.value = option.id;
    item.textContent = option.label;
    select.appendChild(item);
  }
  select.value = value;
  select.addEventListener("change", onChange);
  return select;
}

function createFieldControls(controls) {
  const controlsNode = document.createElement("div");
  controlsNode.className = "ok-record-field-controls";
  return appendChildren(controlsNode, intersperseWithSpacer(controls, "ok-record-field-control-gap"));
}

function appendFieldControls(field, fieldLabel, controls) {
  appendChildren(field, [
    fieldLabel,
    createSpacer("ok-record-field-label-gap"),
    createFieldControls(controls),
  ]);
}

function createPanelGroup(titleText, children, options = {}) {
  const group = document.createElement("section");
  group.className = "ok-record-group";

  const body = document.createElement("div");
  body.className = "ok-record-group-body";

  appendChildren(body, children);
  if (options.showTitle !== false) {
    const title = document.createElement("div");
    title.className = "ok-record-group-title";

    const titleTextNode = document.createElement("span");
    titleTextNode.className = "ok-record-group-title-text";
    titleTextNode.textContent = titleText;

    const leftRule = document.createElement("span");
    leftRule.className = "ok-record-group-title-rule";
    leftRule.setAttribute("aria-hidden", "true");

    const rightRule = document.createElement("span");
    rightRule.className = "ok-record-group-title-rule";
    rightRule.setAttribute("aria-hidden", "true");

    appendChildren(title, [leftRule, titleTextNode, rightRule]);
    appendChildren(group, [title, body]);
  } else {
    group.appendChild(body);
  }
  return group;
}

function createButton(labelText, onClick, className = "") {
  const button = document.createElement("button");
  if (className) {
    button.className = className;
  }
  setButtonLabel(button, labelText);
  button.addEventListener("click", () => {
    const result = onClick();
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.log("[OK-Record] button action failed:", error);
      });
    }
  });
  return button;
}

function createControlButton(labelText, onClick, className = "") {
  const control = document.createElement("div");
  control.className = ["ok-record-control-button", className].filter(Boolean).join(" ");
  control.setAttribute("role", "button");
  control.setAttribute("tabindex", "0");
  control.disabled = false;
  setButtonLabel(control, labelText);

  const run = (event) => {
    if (control.disabled || control.getAttribute("aria-disabled") === "true") {
      return;
    }
    const result = onClick(event);
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.log("[OK-Record] control action failed:", error);
      });
    }
  };

  control.addEventListener("click", run);
  control.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    run(event);
  });
  return control;
}

function createButtonRow(buttons, className = "") {
  const row = document.createElement("div");
  row.className = ["ok-record-button-row", className].filter(Boolean).join(" ");
  return appendChildren(row, buttons);
}

function setButtonClassName(button, ...classNames) {
  if (!button) {
    return;
  }
  button.className = classNames.filter(Boolean).join(" ");
}

function setButtonLabel(button, labelText) {
  if (!button) {
    return;
  }

  let label = button.querySelector(".ok-record-button-label");
  if (!label) {
    clearChildren(button);
    label = document.createElement("span");
    label.className = "ok-record-button-label";
    button.appendChild(label);
  }
  label.textContent = labelText;
}

function setButtonTextMetrics(button, fontSize, lineHeight) {
  if (!button) {
    return;
  }
  button.style.fontSize = fontSize;
  button.style.lineHeight = lineHeight;

  const label = button.querySelector(".ok-record-button-label");
  if (label) {
    label.style.fontSize = fontSize;
    label.style.lineHeight = lineHeight;
  }
}

function setControlDisabled(control, disabled) {
  if (!control) {
    return;
  }
  control.disabled = Boolean(disabled);
  control.setAttribute("aria-disabled", String(Boolean(disabled)));
  control.setAttribute("tabindex", disabled ? "-1" : "0");
  if (disabled) {
    control.classList.add("ok-record-control-disabled");
  } else {
    control.classList.remove("ok-record-control-disabled");
  }
}

module.exports = {
  clearChildren,
  appendChildren,
  createSpacer,
  createPanelSectionGap,
  createFieldContainer,
  createFieldLabel,
  createMinuteSecondField,
  createSecondField,
  createInlineSelectControl,
  createPresetSelect,
  appendFieldControls,
  createPanelGroup,
  createButton,
  createControlButton,
  createButtonRow,
  setButtonClassName,
  setButtonLabel,
  setButtonTextMetrics,
  setControlDisabled,
};
