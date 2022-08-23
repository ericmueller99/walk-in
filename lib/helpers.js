import {scroller} from "react-scroll";

export function salesforceConnection() {
  if (!process.env.SALESFORCE_USERNAME || !process.env.SALESFORCE_PASSWORD || !process.env.SALESFORCE_LOGINURL || !process.env.SALESFORCE_TYPE) {
    throw new Error('Salesforce connection details are not set in env.');
  }
  const connectionType = process.env.SALESFORCE_TYPE;
  if (connectionType !== 'sandbox' && connectionType !== 'production') {
    throw new Error('Salesforce connectionType is not set to sandbox or production');
  }
  return {
    username: process.env.SALESFORCE_USERNAME,
    password: process.env.SALESFORCE_PASSWORD,
    loginUrl: process.env.SALESFORCE_LOGINURL,
    connectionType
  }
}

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