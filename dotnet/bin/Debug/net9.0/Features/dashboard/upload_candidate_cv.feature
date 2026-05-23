@dashboard @profile
Feature: Upload Candidate CV
  As a registered candidate on Jobrator
  I want to upload my CV from the dashboard
  So that I can share my resume with employers and complete my profile

  Rule: Authenticated candidate uses the CV upload workflow

    Background:
      Given the authenticated candidate is on the dashboard

    @smoke @regression @profile @positive @requires-login @TC051
    Scenario: TC051 — Upload a valid PDF CV from the dashboard
      When the candidate uploads a valid CV file
      Then the CV upload should be accepted
      And the candidate clicks the OK button on the upload success popup
      When the candidate hovers on the uploaded CV and clicks the view icon
      Then the CV should be opened in a new browser tab
      And the candidate closes the new browser tab
      When the candidate hovers on the uploaded CV and clicks the download icon
      Then the CV should be downloaded successfully
      When the candidate hovers on the uploaded CV and clicks the delete icon
      And the candidate clicks the Delete button to confirm deletion
      Then the CV should no longer appear in the list

    @regression @profile @positive @requires-login @TC052
    Scenario: TC052 — CV upload accepts a Word document (DOCX) format
      When the candidate uploads a valid "docx" format CV file
      Then the CV upload should be accepted
      And the candidate clicks the OK button on the upload success popup
      When the candidate hovers on the uploaded CV and clicks the delete icon
      And the candidate clicks the Delete button to confirm deletion
      Then the CV should no longer appear in the list

    @regression @profile @negative @requires-login @TC053
    Scenario: TC053 — CV upload rejects a file with an unsupported type
      When the candidate attempts to upload a CV with an unsupported file type
      Then the CV upload should not be accepted for an unsupported file type

    @regression @profile @positive @requires-login @TC054
    Scenario: TC054 — Re-uploading a CV replaces the existing file
      When the candidate selects the original CV file without submitting
      And the candidate replaces the CV selection with a replacement file
      And the candidate submits the CV upload form
      Then the replacement CV should be accepted
      And the candidate clicks the OK button on the upload success popup
      When the candidate hovers on the uploaded CV and clicks the delete icon
      And the candidate clicks the Delete button to confirm deletion
      Then the CV should no longer appear in the list

    @regression @security @owasp @a03-injection @requires-login @TC055
    Scenario: TC055 — OWASP A03 — CV containing embedded script content does not trigger XSS
      When the candidate uploads a CV file containing embedded script content
      Then the CV upload workflow should not trigger script execution on the page
      And the candidate clicks the OK button on the upload success popup
      When the candidate hovers on the uploaded CV and clicks the delete icon
      And the candidate clicks the Delete button to confirm deletion
      Then the CV should no longer appear in the list
