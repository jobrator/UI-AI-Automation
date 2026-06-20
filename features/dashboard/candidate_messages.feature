@dashboard @messages
Feature: Candidate Dashboard Messages
  As a registered candidate on Jobrator
  I want to access and manage messages from employers
  So that I can communicate effectively and respond to job opportunities

  Rule: Authenticated candidate accesses messages from the dashboard

    Background:
      Given the authenticated candidate is on the dashboard
      And an employer has previously sent the candidate at least one message

    @smoke @positive @regression @requires-login @TC056
    Scenario: TC056 — Candidate accesses messages via the left panel navigation
      When the candidate clicks the messages button in the left navigation panel
      Then the candidate should be redirected to the messages page
      And the candidate should be able to view their messages on the messages page
      And the candidate should be able to read the full content of a message

    @regression @positive @requires-login @TC058
    Scenario: TC058 — Candidate can reply to an employer message from the messages page
      When the candidate clicks the messages button in the left navigation panel
      Then the candidate should be redirected to the messages page
      When the candidate opens a message from an employer
      And the candidate composes and sends a reply to the employer
      Then the reply should be sent successfully
      And the reply should appear in the conversation thread

    @regression @positive @requires-login @TC059
    Scenario: TC059 — Candidate accesses messages via the Account menu dropdown
      When the candidate opens the Account menu dropdown on the dashboard
      And the candidate clicks the messages option in the Account menu
      Then the candidate should be redirected to the messages page
      And the candidate should be able to view their messages on the messages page
      And the candidate should be able to read the full content of a message

    @regression @positive @requires-login @TC060
    Scenario: TC060 — Candidate receives an email notification for a new employer message
      When an employer sends the candidate a new message
      Then the candidate should receive an email notification to their registered email address
      And the email notification should indicate that a new message has been received from an employer

    @regression @security @owasp @a01-access-control @requires-login @TC061
    Scenario: TC061 — OWASP A01 — Messages page URL does not expose sensitive tokens or credentials
      When the candidate clicks the messages button in the left navigation panel
      Then the messages page URL should not expose any sensitive tokens or user credentials

    @regression @security @owasp @a03-injection @requires-login @TC062
    Scenario: TC062 — OWASP A03 — Message reply input sanitises XSS payloads before sending
      When the candidate clicks the messages button in the left navigation panel
      Then the candidate should be redirected to the messages page
      When the candidate opens a message from an employer
      And the candidate enters a reply containing an XSS payload "<script>alert('msg-xss')</script>"
      Then the XSS script should not execute on the messages page
      And no alert dialog should have been triggered on the messages page

  Rule: Candidate navigates to messages after signing in via the site header

    Background:
      Given an employer has previously sent the candidate at least one message

    @smoke @positive @regression @TC057
    Scenario: TC057 — Candidate accesses messages via the top-right header button after login
      Given the candidate navigates to the Jobrator home page
      And the candidate clicks the login menu in the site header
      And the candidate is redirected to the login page
      When the candidate signs in with valid credentials
      Then the candidate should be redirected to the dashboard
      And the messages button should be visible in the top-right area of the dashboard before the shortlist icon
      When the candidate clicks the messages button in the top-right area of the dashboard
      Then the candidate should be redirected to the messages page
      And the candidate should be able to view their messages on the messages page
      And the candidate should be able to read the full content of a message
