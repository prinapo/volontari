module.exports = {
  extends: ['stylelint-config-standard-scss'],
  rules: {
    'scss/at-extend-no-missing-placeholder': true,
    'scss/no-global-function-names': null,
    'scss/dollar-variable-pattern': null,
    'scss/at-mixin-pattern': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'no-descending-specificity': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'declaration-empty-line-before': null,
    'comment-empty-line-before': null,
    'at-rule-no-unknown': null,
    'scss/at-rule-no-unknown': true,
    'import-notation': 'string',
    'color-function-notation': 'legacy',
    'alpha-value-notation': 'number',
    'color-hex-length': 'long'
  }
}
