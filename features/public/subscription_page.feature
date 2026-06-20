@public @subscription
Feature: Subscription Page — Public Plan Listing
  As a visitor to Jobrator
  I want to view available subscription plans
  So that I can understand pricing before registering or subscribing

  Background:
    Given the user navigates to the Jobrator subscription page

  @smoke @positive @regression @TC_SUB001
  Scenario: TC_SUB001 — Subscription page renders the Jobrator Plus plan with correct pricing
    Then the "Jobrator Plus" subscription plan should be displayed
    And the plan price should show NGN pricing options
    And a Subscribe Now button should be visible

  @regression @positive @TC_SUB002
  Scenario: TC_SUB002 — Subscribe Now redirects an unauthenticated user to the login page
    Given the user is not authenticated
    When the user clicks the Subscribe Now button
    Then the user should be redirected to the login page

  @regression @positive @requires-candidate-login @TC_SUB003
  Scenario: TC_SUB003 — Authenticated candidate can initiate a subscription from the subscription page
    Given the candidate is logged in and navigates to the subscription page
    When the candidate clicks the Subscribe Now button
    Then a payment gateway or checkout page should be presented to the candidate

  @regression @positive @TC_SUB004
  Scenario: TC_SUB004 — Subscription page displays all plan features and benefits
    Then the plan features list should be fully displayed on the page
    And at least three plan benefits should be listed
