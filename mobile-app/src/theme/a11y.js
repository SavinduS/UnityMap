/**
 * SPT-005: Accessibility Helpers
 * Enforces 48dp touch targets and consistent a11y props.
 */
import { touch } from './tokens';

export const HIT_SLOP_48 = touch.hitSlop;

/**
 * Returns spreadable a11y props for pressables.
 * @param {'button'|'tab'|'searchbox'|string} role
 * @param {object} opts { label, hint, state }
 */
export const getA11yProps = (role = 'button', opts = {}) => {
  const { label, hint, state, selected, disabled } = opts;
  const props = {
    accessible: true,
    accessibilityRole: role,
  };
  if (label) props.accessibilityLabel = label;
  if (hint) props.accessibilityHint = hint;
  const a11yState = { ...state };
  if (typeof selected === 'boolean') a11yState.selected = selected;
  if (typeof disabled === 'boolean') a11yState.disabled = disabled;
  if (Object.keys(a11yState).length) props.accessibilityState = a11yState;
  return props;
};

export const touchTargetStyle = {
  minHeight: touch.minHeight,
  minWidth: touch.minWidth,
};

export default { HIT_SLOP_48, getA11yProps, touchTargetStyle };
