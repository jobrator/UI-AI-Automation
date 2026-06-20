@employer @candidates-list
Feature: Employer Candidates List
  As a registered employer on Jobrator
  I want to browse the full list of registered candidates
  So that I can proactively identify and reach out to suitable talent

  Background:
    Given the authenticated employer navigates to the Candidates List page

  @smoke @positive @regression @requires-employer-login @TC_CL001
  Scenario: TC_CL001 — Candidates list page renders candidate cards with key information
    Then candidate cards should be displayed on the candidates list page
    And each candidate card should display the candidate name
    And each candidate card should display key skills
    And each candidate card should display a View Profile button

  @regression @positive @requires-employer-login @TC_CL002
  Scenario: TC_CL002 — Keyword search filters the candidate list
    When the employer enters a keyword in the candidates list search field
    Then only candidates matching the keyword should be displayed on the candidates list page

  @regression @positive @requires-employer-login @TC_CL003
  Scenario: TC_CL003 — Location search filters the candidate list
    When the employer enters a location in the candidates list location field
    Then only candidates from that location should be displayed on the candidates list page

  @regression @positive @requires-employer-login @TC_CL004
  Scenario: TC_CL004 — Clicking View Profile opens the full candidate detail page
    When the employer clicks the View Profile button on a candidate card
    Then the candidate detail page should load
    And the candidate profile should display their skills
    And the candidate profile should display their work experience
    And the candidate profile should display a CV download option if available
