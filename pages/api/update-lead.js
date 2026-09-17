import {hollyburnApi, apiErrorMessage} from "../../lib/hollyburn-api";

export default function handler(req,res) {

  const {basicForm} = req.body;
  if (!basicForm) {
    res.status(400).json({
      result: false,
      errorMessage: "unable to update lead.  basicForm is missing from API call."
    });
    return;
  }

  const {firstName, lastName, phoneNumber, emailAddress, leadCode, Id, recordId} = basicForm;
  const code = leadCode || Id || recordId;
  if (!code) {
    res.status(200).json({
      result: true
    });
    return;
  }

  hollyburnApi()
    .patch(`/leads/${code}`, {
      firstName,
      lastName,
      emailAddress,
      phoneNumber
    })
    .then(response => {
      res.status(200).json(response.data);
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        result: false,
        errorMessage: apiErrorMessage(error, 'internal system error')
      });
    });

}
