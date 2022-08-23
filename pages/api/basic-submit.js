import {Salesforce} from 'salesforce-connect';
import {salesforceConnection} from "../../lib/helpers";

export default function handler(req,res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  //making sure that all the required fields are present.
  const {firstName, lastName, emailAddress, phoneNumber} = req.body;
  if (!firstName || !lastName || !emailAddress || !phoneNumber) {
    res.status(400).json({
      result: false,
      errorMessage: "firstName, lastName, emailAddress, and phoneNumber are required"
    })
    return;
  }

  try {
    const {connectionType, username, password, loginUrl} = salesforceConnection();
    const connection = {
      username, password, loginUrl
    }
    const salesforce = new Salesforce(connectionType, connection);
    salesforce.getLeadOrContact(emailAddress)
      .then(leadOrContact => {
        console.log(leadOrContact);
        res.status(200).json({
          result: true,
          ...leadOrContact
        });
      })
      .catch(error => {
        console.log(error);
        res.status(500).json({
          result: false,
          errorMessage: error.message || "Service integration error.  Unable to get Salesforce data"
        })
      })
  }
  catch (error) {
    console.log(error);
    res.status(500).json({
      result:false,
      errorMessage: error.message || 'Unknown system error.  Please try again.'
    })
  }

}