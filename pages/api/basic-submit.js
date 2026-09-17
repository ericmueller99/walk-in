import {hollyburnApi, apiErrorMessage} from "../../lib/hollyburn-api";

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

  hollyburnApi()
    .post('/leads/lookup', { emailAddress, phoneNumber })
    .then(response => {
      const found = response.data || {};
      res.status(200).json({
        result: true,
        FirstName: found.firstName || firstName,
        LastName: found.lastName || lastName,
        Email: found.emailAddress || emailAddress,
        Phone: found.phoneNumber || phoneNumber,
        isQualified: false,
        invalidFields: [],
        Preference__c: {},
        recordType: found.leadCode ? 'Lead' : null,
        Id: found.leadCode || null,
        leadCode: found.leadCode || null,
        inquiryId: found.inquiryId || null
      });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        result: false,
        errorMessage: apiErrorMessage(error, "Service integration error. Unable to look up this email.")
      });
    });

}
