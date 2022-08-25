import React from "react";
import {useRouter} from "next/router";
import {LoadingWidget, BasicForm, QualifyForm, WalkIn, NeedAssistance, ErrorMessage} from "hollyburn-lib";
import '../node_modules/react-datepicker/dist/react-datepicker.css';
import axios from "axios";
import {Element, scroller, animateScroll as scroll} from 'react-scroll'
import {scrollToWizardTop} from "../lib/helpers";
import AppContext from "../lib/appContext";

export default function Home() {

  const context = React.useContext(AppContext);

  const [basicForm, setBasicForm] = React.useState({result: false});
  const [qualifyForm, setQualifyForm] = React.useState({result: false});
  const [walkInForm, setWalkInForm] = React.useState({result: false});
  const [wizardState, setWizardState] = React.useState({
    view: 'basic'
  });
  const [error, setError] = React.useState({error: false, errorMessage: null})
  const [isLoading, setIsLoading] = React.useState(false);
  const [propertyCode, setPropertyCode] = React.useState(null);
  const router = useRouter();
  const {query} = router;

  //set the building code in the state.  This will be passed to the Walk-In form so that it can pre-fill the building
  React.useEffect(() => {
    setPropertyCode(
      query.building_code ? query.building_code : null
    );
  }, [query]);

  //basic form has been updated
  React.useEffect(() => {

    //if there was a match, but firstName, lastName, or PhoneNumber didnt match what the lead typed in then update Salesforce to match
    if (!basicForm.primaryFieldsMatch && basicForm.primaryFieldsMatch === false && basicForm.recordType) {
      console.log('updating leads firstName, lastName, and phone to match');
      setBasicForm({
        ...basicForm,
        primaryFieldsMatch: true
      })
      //updating Salesforce with the new firstName, lastName, and phoneNumber
      axios.post('/api/update-lead', {basicForm})
        .catch(error => {
          console.log('Unable to update lead from basicForm.  Salesforce returned an error.');
          console.log(error);
        })
    }

    //if the form is not complete yet then do not proceed
    if (!basicForm.result) {
      return;
    }
    //if the check is already complete the do not re-check
    if (basicForm.checkComplete) {
      return;
    }

    //show loading window.
    setIsLoading(true);

    //submitting the step 1 wizard to the handler.  This will check if the user is qualified already in Salesforce and return the data.
    axios.post('/api/basic-submit', basicForm)
      .then(res => {
        const {FirstName: firstName, LastName: lastName, Email: emailAddress, Phone: phoneNumber, isQualified, invalidFields, Preference__c: preferences = {}, recordType, Id: recordId} = res.data;
        const {Suite_Type__c: suiteTypes, Maximum_Budget__c: maxBudget, Desired_Move_In_Date__c: moveIn, Number_of_Occupants__c: numberOfOccupants, City__c: cities,
          Neighbourhood__c: neighbourhoods, Pet_Friendly__c: petFriendly = false} = preferences || {};
        const primaryFieldsMatch = (firstName === basicForm.firstName  && lastName === basicForm.lastName && phoneNumber === basicForm.phoneNumber);
        //if the qualifyForm is completed the reset it and let the new submission determine.
        if (qualifyForm.result) {
          setQualifyForm({result: false})
        }
        setBasicForm({
          ...basicForm,
          checkComplete: true,
          isQualified: isQualified ? isQualified : false,
          recordType, recordId,
          //taking the basic information from step 1
          firstName: basicForm.firstName,
          lastName: basicForm.lastName,
          emailAddress: emailAddress ? emailAddress : basicForm.emailAddress,
          phoneNumber: basicForm.phoneNumber,
          invalidFields,
          suiteTypes: suiteTypes ? suiteTypes.split(';') : [], maxBudget, numberOfOccupants,
          cities: cities ? cities.split(';') : [],
          neighbourhoods: neighbourhoods ? neighbourhoods.split(';') : [],
          moveIn: moveIn ? new Date(moveIn) : null,
          petFriendly,
          primaryFieldsMatch
        })
        //if the qualification form is already setup then reset it
        setIsLoading(false);
        setError({error:false})
        setWizardState({
          ...wizardState,
          view: isQualified ? 'walk-in' : 'qualify'
        })
        scrollToWizardTop();
      })
      .catch(error => {
        console.log(error);
        setBasicForm({...basicForm, result: false})
        console.log(error.response.data.errorMessage);
        setError({
          error: true,
          errorMessage: error.response?.data?.errorMessage || "There was an error.  Please ensure the email address entered is valid and does not contain any special characters."
        })
        setIsLoading(false);
        scrollToWizardTop();
      });

  }, [basicForm])

  //qualify form has been updated
  React.useEffect(() => {

    if (qualifyForm.qualifyComplete) {
      return;
    }

    const {formSubmissionId} = qualifyForm;
    if (formSubmissionId) {
      //if the view is being manually set remove it
      setError({
        error: false
      })
      setWizardState({
        ...wizardState,
        view: 'walk-in'
      })
      setQualifyForm({
        ...qualifyForm,
        qualifyComplete: true,
      })
      //if the basic form showed not qualified, now make them qualified based on the new submission.
      if (!basicForm.isQualified) {
        setBasicForm({
          ...basicForm,
          isQualified: true
        })
      }
      scrollToWizardTop();
    }

  }, [qualifyForm]);

  //Walk-in form has been updated
  React.useEffect(() => {

    if (walkInForm.walkInComplete || !walkInForm.result) {
      return;
    }

    setIsLoading(true);
    const postData = {
      formCompleted: true,
      basicForm, qualifyForm, walkInForm
    }
    axios.post('/api/walkin-submit', postData)
      .then(res => {
        setWalkInForm({
          ...walkInForm,
          walkInComplete: true,
        })
        setIsLoading(true);
        setError({
          error: false
        })
        context.setSession(postData);
        router.push('/thank-you');
      })
      .catch(error => {
        setIsLoading(false);
        setError({
          error: true,
          errorMessage: error.response?.data?.errorMessage || 'Unknown error occurred.  Please try again.'
        })
      })

  }, [walkInForm])

  //content for the Wizard
  const WizardContent = ({title, descriptionText, disclaimerText}) => {
    return (
      <>
        <div className="max-w-md mx-auto sm:max-w-2xl lg:mx-0">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-gray-500 sm:mt-3">
            {descriptionText}
          </p>
        </div>
        {
          disclaimerText &&
          <div className="mx-auto mt-4">
            <p className="text-xs text-hbBlue">
              {disclaimerText}
            </p>
          </div>
        }
      </>
    )
  }
  const handleQualifyBack = () => {
    setWizardState({
      ...wizardState,
      view: 'basic'
    })
  }
  const handleWalkInBack = () => {
    if (qualifyForm.result) {
      setWizardState({
        ...wizardState,
        view: 'qualify'
      })
    }
    else {
      setWizardState({
        ...wizardState,
        view: 'basic'
      })
    }
  }
  const handlePreferenceUpdate = (event) => {
    if (event && event.preventDefault) {
      event.preventDefault();
    }
    setWizardState({
      ...wizardState,
      view: 'qualify'
    })
  }

  //rendering the wizard
  const Wizard = () => {

    //basic form options
    const basicOptions = {
      buttonText: 'Next',
      formHolderClasses: 'none',
      formClasses: 'mt-9 grid grid-cols-1 lg:grid-cols-2 gap-y-6 sm:gap-x-8',
      textInputHolderClasses: 'col-span-2 lg:col-span-1',
      title: 'Basic Information',
      descriptionText: 'Please enter your basic information so that we can see if you exist in our system already'
    }

    //preferences from basic search or qualification form
    const preferences = {
      ...basicForm,
      ...qualifyForm
    }

    //qualify form options
    const qualifyOptions = {
      buttonText: 'Next',
      showBack: true,
      handleBackButton: handleQualifyBack,
      submitUrl: '/api/qualify-submit',
      formHolderClasses: 'pt-5',
      formClasses: 'mt-9 grid grid-cols-1 lg:grid-cols-2 gap-y-6 sm:gap-x-8',
      textInputHolderClasses: 'col-span-2 lg:col-span-1',
      title: 'Qualification Form',
      descriptionText: 'It looks like you aren\'t in our system yet or we are missing some important information.  Please complete our qualification form so that we can show you the suites that match your preferences.'
    }

    //walk-in form options
    const walkInOptions = {
      showBack: true,
      handleBackButton: handleWalkInBack,
      buttonText: 'Submit',
      title: 'Walk-In Details',
      descriptionText: 'Please select the property and suite(s) you will be viewing today.',
      formHolderClasses: 'none',
      availableSuiteHolderClasses: 'mt-4 grid grid-cols-1 2xl:grid-cols-2 gap-y-6 lg:gap-x-4',
      preferences,
      showUpdatePrefsBanner: true,
      handleUpdatePrefs: handlePreferenceUpdate
    }

    //render state
    switch (wizardState.view) {
      case 'basic':
        return (
          <>
            <WizardContent {...basicOptions} />
            <BasicForm stateSetter={setBasicForm} options={basicOptions} {...basicForm} />
            {
              error.error && error.errorMessage && <ErrorMessage errorMessage={error.errorMessage} />
            }
          </>
        )
      case 'qualify':
        return (
          <>
            <WizardContent {...qualifyOptions} />
            <QualifyForm options={qualifyOptions} stateSetter={setQualifyForm} {...preferences} />
            {
                error.error && error.errorMessage && <ErrorMessage errorMessage={error.errorMessage} />
            }
          </>
        )
      case 'walk-in':
        return (
          <>
            <WizardContent {...walkInOptions} />
            <WalkIn options={walkInOptions} stateSetter={setWalkInForm} propertyCode={propertyCode} />
            {
                error.error && error.errorMessage && <ErrorMessage errorMessage={error.errorMessage} />
            }
          </>
        )
    }

  }

  return (
    <main>

      {/*Hero Image*/}
      <section className="absolute top-0 h-44 w-full">
        <div className="py-44 lg:py-60 2xl:py-72 w-full bg-cover relative text-white lg:bg-right bg-walkInBanner">
          <div className="relative h-full"></div>
        </div>
      </section>

      {/*Walk-in Intro*/}
      <div className="min-h-screen grid grid-cols-1 items-center pt-44 2xl:pt-72">
        <div className="relative">
          <div className="max-w-md sm:max-w-lg mx-auto pl-4 pr-8 sm:px-6 lg:max-w-7xl lg:px-8 py-24 bg-white z-50 xl:rounded-xl">
            <h1 className="text-4xl leading-10 font-extrabold tracking-tight text-gray-900 text-center sm:text-5xl sm:leading-none lg:text-6xl">
              Walk-in Form
            </h1>
            <p className="mt-6 max-w-3xl mx-auto text-xl leading-normal text-gray-500 text-center">
              Thank you for your interest in Hollyburn Properties.
            </p>
            <p className="mt-6 max-w-3xl mx-auto text-xl leading-normal text-gray-500 text-center">
              Please fill out our Walk-In form to ensure you are qualified
              in our system and, optionally, to receive an application form if you would like to apply.
            </p>
            <div className="mt-6 max-w-3xl mx-auto leading-normal text-gray-500 text-center">
              <button type="button" onClick={(event) => scrollToWizardTop(event)}
                      className="mt-2 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-hbBlue hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {/*Wizard screen*/}
      <div className="relative bg-hbLightGray min-h-screen pb-4">

        {/*Top of Wizard*/}
        <Element name="wizard-top"></Element>

        {/*Loading Widget*/}
        <LoadingWidget isLoading={isLoading} />

        {/*right side image*/}
        <div className="lg:absolute lg:inset-0">
          <div className="lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <img className="h-56 w-full object-cover lg:absolute lg:h-full transition transition-all ease-in-out duration-300"
                 src={`/images/wizard1.jpg`}
                 alt="Book a Viewing" />
          </div>
        </div>

        {/*Form Holder*/}
        <div className="relative px-4 sm:px-6 lg:px-8 lg:mx-auto lg:grid lg:grid-cols-2 min-h-screen items-center">
          <div className="lg:pr-8">
            <div className="lg:px-10 my-10">

              {/*Walk-in Wizard */}
              <Wizard />

            </div>
          </div>
        </div>
      </div>

      {/*Need Assistance*/}
      <NeedAssistance />

    </main>
  )
}
