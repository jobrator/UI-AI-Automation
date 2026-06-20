@admin @reference-data
Feature: Admin Reference Data Management
  As a platform administrator
  I want to manage platform reference data including skills, industries, countries, states, cities, and languages
  So that this data is available for use by employers when posting jobs and by candidates when building profiles

  # NOTE: Skills and Industries created here are prerequisites for employer job posting.
  # See features/employer/post_job.feature (TC_PJ001) and features/journeys/job_application_journey.feature.

  Background:
    Given the authenticated admin is on the admin dashboard

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Skills Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin performs CRUD operations on Skills

    Background:
      Given the admin navigates to the Skills management page

    @smoke @positive @regression @TC_RD001
    Scenario: TC_RD001 — Admin can add a new skill to the platform
      When the admin clicks the Add New Skill button
      And the admin enters a unique skill name
      And the admin saves the new skill
      Then the new skill should appear in the skills table

    @regression @positive @TC_RD002
    Scenario: TC_RD002 — Admin can edit an existing skill name
      Given at least one skill exists in the skills table
      When the admin clicks the Edit action on a skill record
      And the admin modifies the skill name
      And the admin saves the changes
      Then the updated skill name should be reflected in the skills table

    @regression @positive @TC_RD003
    Scenario: TC_RD003 — Admin can delete a skill from the platform
      Given at least one skill exists that can be safely deleted
      When the admin clicks the Delete action on that skill
      And the admin confirms the deletion
      Then the skill should be removed from the skills table

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Industries Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin performs CRUD operations on Industries

    Background:
      Given the admin navigates to the Industries management page

    @regression @positive @TC_RD004
    Scenario: TC_RD004 — Admin can manage industry categories with full CRUD operations
      When the admin adds a new industry category with a unique name
      Then the new industry category should appear in the industries table
      When the admin edits the industry category name
      Then the updated industry name should be reflected in the industries table
      When the admin deletes the industry category
      Then the industry category should be removed from the industries table

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 3: Geographic Reference Data
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin views geographic reference data

    @regression @positive @TC_RD005
    Scenario: TC_RD005 — Countries page displays country reference records in a table
      Given the admin navigates to the Countries management page
      Then a table of country records should be displayed on the countries page

    @regression @positive @TC_RD006
    Scenario: TC_RD006 — States table includes a Country column showing the associated country
      Given the admin navigates to the States management page
      Then the states table should be displayed
      And each state record should include a Country column with the associated country name

    @regression @positive @TC_RD007
    Scenario: TC_RD007 — Cities table includes a State column showing the associated state
      Given the admin navigates to the Cities management page
      Then the cities table should be displayed
      And each city record should include a State column with the associated state name

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 4: Languages Management
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin manages platform languages

    Background:
      Given the admin navigates to the Languages management page

    @regression @positive @TC_RD008
    Scenario: TC_RD008 — Admin can add a new language to the platform
      When the admin clicks the Add New Language button
      And the admin enters a unique language name
      And the admin saves the new language
      Then the new language should appear in the languages table
