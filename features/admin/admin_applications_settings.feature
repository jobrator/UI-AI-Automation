@admin @applications @settings
Feature: Admin Applications and System Settings Management
  As a platform administrator
  I want to manage all job applications and system configuration settings
  So that I can oversee the hiring pipeline and maintain platform behaviour

  Background:
    Given the authenticated admin is on the admin dashboard

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Applications Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views and manages all platform job applications

    Background:
      Given the admin navigates to the Applications management page

    @smoke @positive @regression @TC_AAS001
    Scenario: TC_AAS001 — Applications page displays all platform job applications
      Then a table of application records should be displayed on the applications page
      And each application record should display the application ID
      And each application record should display the application status
      And each application record should display the closed indicator
      And each application record should display the candidate ID
      And each application record should display the job post ID

    @regression @positive @TC_AAS002
    Scenario: TC_AAS002 — Admin can update the status of an application and changes are visible to the candidate and employer
      Given at least one application exists in the applications list
      When the admin clicks the Edit action on an application record
      And the admin changes the application status to "Reviewed"
      And the admin saves the changes
      Then the updated status should be reflected in the admin applications list
      And the updated status should be visible to the candidate on their Applied Jobs page

    @regression @positive @TC_AAS003
    Scenario: TC_AAS003 — Admin can close or reopen an application using the Closed toggle
      Given at least one application exists in the applications list
      When the admin edits an application and toggles the Closed field to closed
      And the admin saves the changes
      Then the application should be marked as closed in the admin applications list
      When the admin reopens the application by toggling the Closed field back
      Then the application should be marked as open in the admin applications list

    @regression @positive @TC_AAS004
    Scenario: TC_AAS004 — Admin can search and filter applications in the applications table
      When the admin uses the search functionality on the applications page
      Then only applications matching the search term should be displayed in the table

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: System Settings
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views and manages system configuration settings

    Background:
      Given the admin navigates to the System Settings page

    @regression @positive @TC_AAS005
    Scenario: TC_AAS005 — System Settings page displays configuration key-value pairs
      Then a table of system settings should be displayed on the settings page
      And each setting record should display the setting ID
      And each setting record should display the setting name
      And each setting record should display the current value
      And each setting record should display the default value

    @regression @positive @TC_AAS006
    Scenario: TC_AAS006 — Admin can edit a system setting value and the new value is applied
      Given at least one system setting exists that can be safely modified
      When the admin clicks the Edit action on a system setting
      And the admin modifies the setting value
      And the admin saves the changes
      Then the updated setting value should be reflected in the system settings table

    @regression @positive @TC_AAS007
    Scenario: TC_AAS007 — Admin can add a new system setting with a name and value
      When the admin navigates to the create new setting form
      And the admin fills in a unique setting name and value
      And the admin saves the new setting
      Then the new system setting should appear in the settings table
