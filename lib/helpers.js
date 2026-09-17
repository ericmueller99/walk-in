import {scroller} from "react-scroll";

export const scrollToWizardTop = (event, options = {}) => {
  const {duration = 800, delay = 0, smooth = 'easeInOutQuart', stateSetter, newState} = options;
  if (event && event.preventDefault()) {
    event.preventDefault();
  }
  if (newState && stateSetter && typeof stateSetter === "function") {
    stateSetter(newState);
  }
  scroller.scrollTo('wizard-top', {
    duration,
    delay,
    smooth
  });
}
