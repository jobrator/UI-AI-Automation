@candidate @subscription-history
Feature: Candidate Subscription History
  As a registered candidate on Jobrator
  I want to view my subscription history
  So that I can track the plans I have purchased and their validity periods

  Background:
    Given the authenticated candidate navigates to the Subscription History page

  @smoke @positive @regression @requires-candidate-login @TC_SUBH001
  Scenario: TC_SUBH001 — Subscription history page loads and displays plan billing details
    Given the candidate has an active or past subscription
    Then the subscription plan name should be displayed on the subscription history page
    And the subscription start date should be displayed
    And the subscription end date should be displayed
    And the subscription status should be displayed

  @regression @positive @requires-candidate-login @TC_SUBH002
  Scenario: TC_SUBH002 — Subscription history page is accessible from the dashboard sidebar
    Given the authenticated candidate is on the dashboard
    When the candidate clicks the Subscriptions link in the dashboard sidebar
    Then the candidate should be navigated to the Subscription History page

  @regression @positive @requires-candidate-login @TC_SUBH003
  Scenario: TC_SUBH003 — Empty state is shown when the candidate has no subscription history
    Given the candidate account has no subscription history
    When the candidate navigates to the Subscription History page
    Then an appropriate empty state message or no-records indicator should be displayed
