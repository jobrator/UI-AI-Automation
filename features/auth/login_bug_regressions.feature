@authentication @login @regression
Feature: Login — regression checks for fixed ADO bugs
  Each scenario pins a login defect that has been retested and found fixed, so it
  cannot come back unnoticed. Retested on 2026-09-26.

  # ADO-29456: the login page used to default to "Candidate". Users must now choose.
  @ADO-29456 @negative
  Scenario: Login page makes the user choose Candidate or Employer
    Given the Jobrator login page is opened without choosing an account type
    Then neither the Candidate nor the Employer account type should be preselected
    When the user submits the login form without choosing an account type
    Then the user should be asked to select an account type

  # ADO-29981: a wrong password on a real account used to return the internal
  # "E_INVALID_AUTH_PASSWORD" exception, which told an attacker the email was registered.
  @ADO-29981 @security @owasp @api
  Scenario: Login API gives the same generic answer for a wrong password and an unknown email
    When a wrong password is sent to the login API for the registered candidate
    And a wrong password is sent to the login API for an unregistered email
    Then both login API responses should be the same generic 401
    And neither login API response should expose an exception code

  # ADO-29637: there used to be no lockout at all. The API now answers 429 from the
  # fifth consecutive failure. A throwaway email is used so no real account is locked.
  @ADO-29637 @security @owasp @api
  Scenario: Login API locks an email out after five failed attempts
    When 5 wrong passwords are sent to the login API for a new throwaway email
    Then the last login API response should say there were too many login attempts
