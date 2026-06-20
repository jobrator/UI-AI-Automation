@employer @dashboard
Feature: Employer Dashboard
  As a registered employer on Jobrator
  I want to access my company dashboard after logging in
  So that I can manage job postings, review applicants, and track hiring activity

  Background:
    Given the authenticated employer is on the employer dashboard

  @smoke @positive @regression @requires-employer-login @TC_ED001
  Scenario: TC_ED001 — Employer dashboard loads with company-specific overview and statistics
    Then the employer dashboard should be fully loaded
    And the employer dashboard should display company navigation items
    And the employer dashboard should display key hiring statistics

  @regression @positive @requires-employer-login @TC_ED002
  Scenario: TC_ED002 — Dashboard notification badge displays the correct unread count
    Given the employer has unread notifications
    Then the notification badge on the employer dashboard should display a non-zero count

  @smoke @positive @regression @requires-employer-login @TC_ED003
  Scenario: TC_ED003 — Post A New Job CTA is accessible from the employer dashboard
    When the employer clicks the Post A New Job link on the dashboard
    Then the post new job page should load

  @smoke @positive @regression @requires-employer-login @TC_ED004
  Scenario: TC_ED004 — Manage Jobs link navigates to the employer job management page
    When the employer clicks the Manage Jobs link on the dashboard
    Then the manage jobs page should load

  @regression @session @requires-employer-login @TC_ED005
  Scenario: TC_ED005 — Logging out from the employer dashboard terminates the session correctly
    When the employer clicks the Logout control on the dashboard
    Then the employer session should be destroyed
    And the employer should be redirected to the login page
