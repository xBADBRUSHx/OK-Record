"use strict";

module.exports = `
  html {
    height: 100%;
    overflow: hidden;
  }

  body {
    margin: 0;
    height: 100%;
    overflow: hidden;
    color: rgba(235, 240, 248, 0.92);
    background: #000000;
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    cursor: default;
  }

  .ok-record-panel {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0;
    width: 100%;
    max-width: none;
    height: 100vh;
    min-height: 0;
    margin: 0;
    overflow-x: hidden;
    overflow-y: auto;
    scrollbar-width: none;
    padding: 16px;
    border: 0;
    border-radius: 0;
    background: #1e1e1e;
    cursor: default;
  }

  .ok-record-panel-section-gap {
    display: block;
    flex: 0 0 20px;
    width: 100%;
    height: 20px;
    min-height: 20px;
    pointer-events: none;
  }

  .ok-record-panel::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .ok-record-group {
    box-sizing: border-box;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
    padding: 0;
    background: transparent;
  }

  .ok-record-group + .ok-record-group {
    margin-top: 0;
  }

  .ok-record-group-title {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    min-height: 30px;
    margin: 0 0 16px;
    color: rgba(235, 240, 248, 0.64);
    font-size: 24px;
    font-weight: 700;
    line-height: 30px;
  }

  .ok-record-group-title-text {
    flex: 0 0 auto;
    min-width: 0;
    margin: 0 24px;
    text-align: center;
    white-space: nowrap;
    overflow-wrap: anywhere;
  }

  .ok-record-group-title-rule {
    display: block;
    flex: 1 1 auto;
    height: 1px;
    min-width: 24px;
    background: #444444;
  }

  .ok-record-export-group .ok-record-group-title {
    margin-bottom: 0;
  }

  .ok-record-group-body {
    box-sizing: border-box;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    min-width: 0;
  }

  .ok-record-recording-group .ok-record-group-body {
    gap: 0;
  }

  .ok-record-export-group .ok-record-group-body {
    gap: 0;
  }

  .ok-record-export-notice {
    box-sizing: border-box;
    display: none;
    flex: 0 0 auto;
    flex-direction: column;
    gap: 0;
    width: 100%;
    min-width: 0;
    margin: 0;
    padding: 12px;
    border: 1px solid rgba(157, 183, 255, 0.34);
    border-radius: 10px;
    background: #171717;
    color: rgba(235, 240, 248, 0.86);
  }

  .ok-record-export-notice-visible {
    display: flex;
    margin-top: 12px;
  }

  .ok-record-export-notice-success {
    border-color: rgba(23, 229, 126, 0.42);
  }

  .ok-record-export-notice-error {
    border-color: rgba(255, 102, 102, 0.52);
  }

  .ok-record-export-notice-header {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .ok-record-export-notice-title {
    min-width: 0;
    color: rgba(235, 240, 248, 0.96);
    font-size: 16px;
    font-weight: 700;
    line-height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ok-record-notice-close-button {
    flex: 0 0 28px;
    width: 28px;
    min-width: 28px;
    min-height: 28px;
    padding: 0;
    border-radius: 8px;
    line-height: 18px;
  }

  .ok-record-export-notice-body {
    box-sizing: border-box;
    display: block;
    flex: 0 0 auto;
    width: 100%;
    min-width: 0;
    min-height: 72px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    resize: none;
    background: transparent;
    color: rgba(235, 240, 248, 0.74);
    font-family: "Segoe UI", "Helvetica Neue", sans-serif;
    font-size: 13px;
    line-height: 18px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow-x: hidden;
    overflow-y: auto;
    cursor: text;
    user-select: text;
  }

  .ok-record-field {
    box-sizing: border-box;
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: 0;
    align-items: center;
    width: 100%;
    min-height: 30px;
    padding: 0;
    color: #cccccc;
    font-size: 16px;
    line-height: 20px;
  }

  .ok-record-recording-group .ok-record-field {
    min-height: 28px;
  }

  .ok-record-field-label {
    flex: 1 1 180px;
    min-width: 0;
    color: #cccccc;
    font-weight: 400;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .ok-record-field-label-gap {
    display: block;
    flex: 0 0 8px;
    width: 8px;
    min-width: 8px;
    height: 1px;
    pointer-events: none;
  }

  .ok-record-field-controls {
    display: flex;
    flex: 0 0 auto;
    gap: 0;
    align-items: center;
    justify-content: flex-end;
    min-width: 0;
    margin-left: 0;
    white-space: nowrap;
  }

  .ok-record-field-control-gap {
    display: block;
    flex: 0 0 8px;
    width: 8px;
    min-width: 8px;
    height: 1px;
    pointer-events: none;
  }

  .ok-record-number-input {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex: 0 0 96px;
    width: 96px;
    height: 28px;
    min-height: 28px;
    border: 1px solid #5a5a5a;
    border-radius: 6px;
    padding: 4px 8px;
    background: #1f1f1f;
    color: #ffffff;
    font-size: 14px;
    line-height: 18px;
    text-align: right;
    box-shadow: none;
    cursor: text;
    user-select: none;
  }

  .ok-record-number-value {
    display: block;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-align: right;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  input.ok-record-number-editor-input {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    display: block;
    flex: 1 1 auto;
    width: 100%;
    min-width: 0;
    height: 100%;
    min-height: 0;
    border: 0;
    border-radius: 6px;
    margin: 0;
    padding: 3px 8px;
    background: #1f1f1f;
    color: #ffffff;
    font-size: 14px;
    line-height: 20px;
    text-align: right;
    box-shadow: none;
    outline: none;
    font-variant-numeric: tabular-nums;
  }

  .ok-record-number-input.ok-record-number-editing {
    padding: 0;
  }

  select {
    -webkit-appearance: none;
    appearance: none;
    box-sizing: border-box;
    flex: 0 0 128px;
    width: 128px;
    height: 28px;
    min-height: 28px;
    border: 1px solid #5a5a5a;
    border-radius: 6px;
    padding: 4px 6px;
    background: #1f1f1f;
    background-clip: border-box;
    background-image: none;
    color: #ffffff;
    font-size: 14px;
    line-height: 18px;
    box-shadow: none;
    outline: none;
    cursor: pointer;
  }

  .ok-record-number-input:hover,
  select:hover {
    border-color: #6a6a6a;
    background: #1f1f1f;
  }

  .ok-record-number-input:focus,
  .ok-record-number-input.ok-record-number-editing,
  select:focus {
    outline: none;
    border-color: #9db7ff;
    box-shadow: none;
  }

  .ok-record-number-input.ok-record-number-disabled {
    color: #8f8f8f;
    cursor: default;
    opacity: 0.65;
  }

  .ok-record-quality-controls {
    display: flex;
    flex: 0 0 auto;
    gap: 0;
    align-items: center;
    min-width: 0;
    max-width: 100%;
    flex-wrap: nowrap;
    justify-content: flex-end;
  }

  .ok-record-quality-control-gap {
    display: block;
    flex: 0 0 8px;
    width: 8px;
    min-width: 8px;
    height: 1px;
    pointer-events: none;
  }

  .ok-record-quality-option {
    display: flex;
    flex: 0 0 auto;
    gap: 0;
    align-items: center;
    min-width: 0;
    color: #cccccc;
    font-size: 16px;
    line-height: 20px;
  }

  .ok-record-quality-option-gap {
    display: block;
    flex: 0 0 8px;
    width: 8px;
    min-width: 8px;
    height: 1px;
    pointer-events: none;
  }

  .ok-record-quality-option-label {
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .ok-record-quality-option select {
    flex: 0 0 88px;
    width: 88px;
    min-width: 88px;
  }

  input.ok-record-checkbox {
    flex: 0 0 18px;
    width: 18px;
    min-height: 18px;
    padding: 0;
    accent-color: #b3b2ff;
    cursor: pointer;
  }

  .ok-record-short-number {
    flex-basis: 56px;
    width: 56px;
    text-align: right;
  }

  .ok-record-unit-label {
    flex: 0 0 auto;
    color: #cccccc;
    font-size: 16px;
    line-height: 20px;
  }

  .ok-record-timer-control-row {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: 0;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin-top: 0;
  }

  .ok-record-timer-status-button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 1 190px;
    width: 190px;
    min-width: 150px;
    max-width: 240px;
    height: 48px;
    min-height: 48px;
    padding: 0 14px;
    color: rgba(235, 240, 248, 0.48);
    font-size: 16px;
    line-height: 22px;
    cursor: pointer;
  }

  .ok-record-timer-status-button .ok-record-button-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    height: 100%;
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .ok-record-timer-indicator-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 14px;
    width: 14px;
    height: 22px;
    margin-right: 10px;
  }

  .ok-record-timer-indicator-slot-hidden {
    display: none;
  }

  .ok-record-timer-indicator {
    display: block;
    flex: 0 0 14px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: rgba(235, 240, 248, 0.34);
  }

  .ok-record-timer-indicator-active {
    background: #ff5a5a;
  }

  .ok-record-timer-indicator-waiting {
    background: #17e57e;
  }

  .ok-record-timer-indicator-idle {
    background: #f2c94c;
  }

  .ok-record-timer-indicator-hidden {
    display: none;
  }

  .ok-record-timer-text {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: translateY(-1px);
  }

  .ok-record-timer-status-button.ok-record-timer-clock-active {
    color: rgba(255, 255, 255, 0.96);
  }

  .ok-record-timer-status-button.ok-record-timer-clock-ended {
    color: #ff6666;
  }

  .ok-record-timer-status-button:hover,
  .ok-record-timer-status-button:active {
    transform: none;
  }

  .ok-record-button-row {
    display: flex;
    flex: 0 0 auto;
    flex-wrap: nowrap;
    gap: 0;
    width: 100%;
    min-width: 0;
    margin: 0;
  }

  .ok-record-button-row > * {
    margin: 0;
  }

  .ok-record-button-row > * + * {
    margin-left: 8px;
  }

  .ok-record-button-row button {
    flex: 1 1 0;
    min-width: 0;
  }

  .ok-record-button-row .ok-record-control-button {
    flex: 1 1 0;
    min-width: 0;
  }

  .ok-record-primary-action-row {
    justify-content: center;
  }

  .ok-record-primary-action-row .ok-record-timer-status-button,
  .ok-record-primary-action-row .ok-record-record-status-button,
  .ok-record-primary-action-row .ok-record-step-status-button {
    flex: 0 1 190px;
    width: 190px;
    min-width: 150px;
    max-width: 240px;
  }

  .ok-record-recording-button-row-gap {
    display: block;
    flex: 0 0 12px;
    width: 100%;
    height: 12px;
    min-height: 12px;
    pointer-events: none;
  }

  .ok-record-recording-input-row-gap {
    display: block;
    flex: 0 0 8px;
    width: 100%;
    height: 8px;
    min-height: 8px;
    pointer-events: none;
  }

  .ok-record-export-action-row-gap {
    display: block;
    flex: 0 0 0;
    width: 100%;
    height: 0;
    min-height: 0;
    pointer-events: none;
  }

  .ok-record-export-button-row-gap {
    display: block;
    flex: 0 0 12px;
    width: 100%;
    height: 12px;
    min-height: 12px;
    pointer-events: none;
  }

  .ok-record-export-input-row-gap {
    display: block;
    flex: 0 0 8px;
    width: 100%;
    height: 8px;
    min-height: 8px;
    pointer-events: none;
  }

  .ok-record-directory-row button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    min-height: 32px;
    max-height: 32px;
    padding: 0 10px;
    line-height: 18px;
  }

  .ok-record-clear-recording-row {
    margin-top: 0;
  }

  .ok-record-danger-button {
    border-color: rgba(255, 102, 102, 0.72);
    background: rgba(255, 90, 90, 0.14);
    color: rgba(255, 225, 225, 0.96);
    font-weight: 700;
  }

  .ok-record-danger-button:hover,
  .ok-record-danger-button:focus {
    border-color: rgba(255, 124, 124, 0.92);
    background: rgba(255, 90, 90, 0.20);
    color: #ffffff;
  }

  .ok-record-danger-button:active {
    border-color: rgba(255, 150, 150, 0.92);
    background: rgba(255, 90, 90, 0.26);
  }

  .ok-record-compact-button {
    flex: 0 0 76px;
    min-width: 64px;
    max-width: 96px;
  }

  button,
  .ok-record-control-button {
    min-height: 32px;
    border: 1px solid rgba(157, 183, 255, 0.56);
    border-radius: 10px;
    background: rgba(157, 183, 255, 0.08);
    color: rgba(235, 240, 248, 0.92);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    transition:
      background 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      opacity 160ms ease;
    user-select: none;
  }

  .ok-record-button-label {
    display: block;
    min-width: 0;
    font-size: 14px;
    font-weight: 400;
    line-height: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;
  }

  .ok-record-record-status-button,
  .ok-record-step-status-button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 0;
    height: 48px;
    min-height: 48px;
    padding: 0 14px;
    font-size: 16px;
    line-height: 22px;
  }

  .ok-record-export-status-button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 0;
    height: 40px;
    min-height: 40px;
    padding: 0 14px;
    font-size: 16px;
    line-height: 22px;
  }

  .ok-record-record-status-button .ok-record-button-label,
  .ok-record-step-status-button .ok-record-button-label,
  .ok-record-export-status-button .ok-record-button-label {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    width: 100%;
    height: 100%;
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .ok-record-record-indicator-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 14px;
    width: 14px;
    height: 22px;
    margin-right: 10px;
  }

  .ok-record-export-indicator-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 14px;
    width: 14px;
    height: 22px;
    margin-right: 10px;
  }

  .ok-record-record-indicator {
    display: block;
    flex: 0 0 14px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: transparent;
  }

  .ok-record-export-indicator {
    display: block;
    flex: 0 0 14px;
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: transparent;
  }

  .ok-record-record-indicator-active {
    background: #ff5a5a;
  }

  .ok-record-record-indicator-error {
    background: #ff5a5a;
  }

  .ok-record-record-indicator-paused {
    background: #f2c94c;
  }

  .ok-record-export-indicator-exporting {
    background: #f2c94c;
  }

  .ok-record-export-indicator-success {
    background: #17e57e;
  }

  .ok-record-export-indicator-failure {
    background: #ff5a5a;
  }

  .ok-record-record-text {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: translateY(-1px);
  }

  .ok-record-export-text {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    transform: translateY(-1px);
  }

  .ok-record-step-indicator {
    display: block;
    flex: 0 0 12px;
    width: 12px;
    height: 12px;
    margin-right: 10px;
    border-radius: 999px;
    background: transparent;
  }

  .ok-record-step-indicator-success {
    background: #17e57e;
  }

  .ok-record-step-indicator-sampling {
    background: #f2c94c;
  }

  .ok-record-step-indicator-hidden {
    display: none;
  }

  button:hover,
  .ok-record-control-button:hover {
    border-color: rgba(157, 183, 255, 0.72);
    background: rgba(157, 183, 255, 0.14);
    color: rgba(255, 255, 255, 0.96);
  }

  button:active,
  .ok-record-control-button:active {
    border-color: rgba(157, 183, 255, 0.82);
    background: rgba(157, 183, 255, 0.18);
  }

  button:focus,
  .ok-record-control-button:focus {
    outline: none;
    border-color: rgba(157, 183, 255, 0.76);
    box-shadow: 0 0 0 2px rgba(179, 178, 255, 0.28);
  }

  button.ok-record-state-active,
  .ok-record-control-button.ok-record-state-active {
    border-color: #4a4a4a;
    background: #242424;
    color: rgba(255, 255, 255, 0.94);
    box-shadow: inset 0 -1px 0 #9db7ff;
  }

  button.ok-record-state-active:hover,
  button.ok-record-state-active:focus,
  .ok-record-control-button.ok-record-state-active:hover,
  .ok-record-control-button.ok-record-state-active:focus {
    border-color: rgba(157, 183, 255, 0.72);
    background: #282828;
  }

  button.ok-record-state-active:active,
  .ok-record-control-button.ok-record-state-active:active {
    border-color: rgba(157, 183, 255, 0.82);
    background: #202020;
  }

  .ok-record-record-status-button.ok-record-state-active {
    border-color: rgba(157, 183, 255, 0.86);
    background: rgba(157, 183, 255, 0.10);
    color: rgba(255, 255, 255, 0.96);
    box-shadow: inset 0 -1px 0 rgba(255, 90, 90, 0.88);
  }

  .ok-record-record-status-button.ok-record-state-active:hover,
  .ok-record-record-status-button.ok-record-state-active:focus {
    border-color: rgba(157, 183, 255, 0.96);
    background: rgba(157, 183, 255, 0.14);
  }

  .ok-record-record-status-button.ok-record-state-active:active {
    border-color: rgba(157, 183, 255, 0.82);
    background: rgba(157, 183, 255, 0.08);
  }

  button:disabled,
  .ok-record-control-button.ok-record-control-disabled,
  input:disabled,
  select:disabled {
    opacity: 0.48;
    cursor: default;
    transform: none;
  }

  button:disabled:hover,
  button:disabled:active,
  .ok-record-control-button.ok-record-control-disabled:hover,
  .ok-record-control-button.ok-record-control-disabled:active {
    border-color: rgba(157, 183, 255, 0.56);
    background: rgba(157, 183, 255, 0.08);
  }

  .ok-record-export-status-button.ok-record-export-state-visible:disabled,
  .ok-record-export-status-button.ok-record-export-state-visible.ok-record-control-disabled {
    opacity: 1;
  }

  .ok-record-export-status-button.ok-record-export-state-visible:disabled:hover,
  .ok-record-export-status-button.ok-record-export-state-visible:disabled:active,
  .ok-record-export-status-button.ok-record-export-state-visible.ok-record-control-disabled:hover,
  .ok-record-export-status-button.ok-record-export-state-visible.ok-record-control-disabled:active {
    border-color: rgba(157, 183, 255, 0.72);
    background: rgba(157, 183, 255, 0.12);
  }
`;
