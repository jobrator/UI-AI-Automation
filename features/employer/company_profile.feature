@employer @company-profile
Feature: Employer Company Profile
  As a registered employer on Jobrator
  I want to manage my company profile
  So that candidates can learn about my organisation when viewing our job postings

  Background:
    Given the authenticated employer navigates to the Company Profile page

  @smoke @positive @regression @requires-employer-login @TC_ECP001
  Scenario: TC_ECP001 — Company profile page renders all required form fields
    Then the company name field should be visible on the company profile page
    And the company description field should be visible
    And the culture field should be visible
    And the values field should be visible
    And the company website field should be visible
    And the contact person field should be visible
    And the contact email field should be visible
    And the contact phone field should be visible
    And the employee count field should be visible
    And the foundation date field should be visible

  @regression @positive @requires-employer-login @TC_ECP002
  Scenario: TC_ECP002 — Employer can update company profile information and see a success message
    When the employer updates the company description with "We are an innovative technology firm."
    And the employer clicks the Save button on the company profile page
    Then a success message should be displayed on the company profile page
    And the updated description should be persisted on the company profile page

  @regression @positive @requires-employer-login @TC_ECP003
  Scenario: TC_ECP003 — Employer can upload a company logo and branding image
    When the employer uploads a valid company logo image
    Then the company logo should be previewed and saved on the company profile page

  @regression @negative @requires-employer-login @TC_ECP004
  Scenario: TC_ECP004 — Required company profile fields show validation errors when submitted empty
    When the employer clears all required fields on the company profile page
    And the employer clicks the Save button on the company profile page
    Then validation errors should appear on all required company profile fields

  @regression @positive @requires-employer-login @TC_ECP005
  Scenario: TC_ECP005 — Completed company profile information is visible to candidates on job detail pages
    Given the employer has a fully completed company profile
    And the employer has published at least one job
    When a candidate views that employer's job detail page
    Then the company information should be displayed on the job detail page
