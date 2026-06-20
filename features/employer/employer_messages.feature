@employer @messages
Feature: Employer Messages
  As a registered employer on Jobrator
  I want to send and receive messages with candidates
  So that I can communicate directly with applicants during the hiring process

  # NOTE: Candidates in this feature are those who have applied to the employer's jobs.
  # For the full cross-portal messaging flow, see features/dashboard/candidate_messages.feature
  # and features/journeys/job_application_journey.feature.

  Background:
    Given the authenticated employer navigates to the Messages page

  @smoke @positive @regression @requires-employer-login @TC_EMSG001
  Scenario: TC_EMSG001 — Employer Messages page loads and displays message threads
    Given the employer has at least one message thread with a candidate
    Then the messages page should display a list of message threads
    And each thread should display the candidate name
    And each thread should display the message subject or preview
    And each thread should display a timestamp

  @regression @positive @requires-employer-login @TC_EMSG002
  Scenario: TC_EMSG002 — Employer can send a message to a candidate from the Messages page
    Given the employer has at least one message thread with a candidate
    When the employer opens a candidate conversation
    And the employer types a message "Please confirm your availability for a follow-up call."
    And the employer sends the message
    Then the message should be sent successfully
    And the message should be visible in the conversation thread

  @regression @positive @requires-employer-login @TC_EMSG003
  Scenario: TC_EMSG003 — Empty state is shown when the employer has no message threads
    Given the employer account has no message threads
    When the employer navigates to the Messages page
    Then an appropriate empty state message should be displayed on the messages page

  @regression @security @owasp @a03-injection @requires-employer-login @TC_EMSG004
  Scenario: TC_EMSG004 — OWASP A03 — XSS payload in message input is sanitised and not executed
    Given the employer has at least one message thread with a candidate
    When the employer opens a candidate conversation
    And the employer enters a message containing the XSS payload "<script>alert('employer-msg-xss')</script>"
    Then the XSS script should not execute on the employer messages page
    And no alert dialog should have been triggered on the employer messages page
