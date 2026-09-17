import {hollyburnApi, apiErrorMessage} from "../../lib/hollyburn-api";

function coercePetFriendly(value) {
  if (value === true || value === 1) return true;
  if (typeof value === 'number' && Number.isFinite(value)) return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  return false;
}

export default function handler(req,res) {

  //only accepting post requests
  if (req.method.toLowerCase() !== 'post') {
    res.status(401).send('');
    return;
  }

  const {firstName, lastName, emailAddress, phoneNumber, suiteTypes, maxBudget, moveIn, petFriendly = false, numberOfOccupants, utmCampaign, utmSource, utmMedium, utmContent, utmTerm, cities, neighbourhoods} = req.body;
  if (!firstName || !lastName || !emailAddress || !phoneNumber || !suiteTypes || !maxBudget || !numberOfOccupants || !cities) {
    res.status(400).json({
      result: false,
      errorMessage: "required fields are missing"
    })
    return;
  }

  const petFriendlyBool = coercePetFriendly(petFriendly);
  const occupants = parseInt(numberOfOccupants, 10);

  hollyburnApi()
    .post('/leads/qualification-form', {
      firstName,
      lastName,
      emailAddress,
      phoneNumber,
      suiteTypes,
      maxBudget,
      moveIn,
      petFriendly: petFriendlyBool,
      numberOfOccupants: Number.isFinite(occupants) ? occupants : numberOfOccupants,
      utmCampaign,
      utmSource,
      utmMedium,
      utmContent,
      utmTerm,
      cities,
      neighbourhoods,
      leadSource: 'Form Submission',
      leadSourceDetail: 'ILS Qualification'
    })
    .then(response => {
      const data = response.data || {};
      //QualifyForm reads res.data.data.id and only then marks the step complete, so the
      //id has to be inside data. Falling back to the API's local form_submissions id
      //means step 2 still advances when hollyburnapi returns no remote form id.
      res.status(200).json({
        result: true,
        data: {
          ...data,
          id: data.id || data.formSubmissionId || null
        },
        formSubmissionId: data.id || data.formSubmissionId || 'local',
        id: data.id || data.formSubmissionId || null,
        inquiryId: data.inquiryId || null
      });
    })
    .catch(error => {
      console.log(error);
      res.status(500).json({
        result: false,
        errorMessage: apiErrorMessage(error)
      });
    });

}
