@admin @assessments
Feature: Admin Assessment Management — Psychometric and Skill Tests
  As a platform administrator
  I want to manage psychometric and skill test assessments
  So that employers can assign tests to candidates to evaluate their suitability

  Background:
    Given the authenticated admin is on the admin dashboard

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 1: Psychometric Tests
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin manages psychometric test exams

    Background:
      Given the admin navigates to the Psychometric Test management page

    @smoke @positive @regression @TC_AT001
    Scenario: TC_AT001 — Psychometric Test page lists all exams with title, status, and action buttons
      Then psychometric exam cards should be displayed on the page
      And each exam card should display the exam title
      And each exam card should display an Active status badge
      And each exam card should display View, Edit, and Delete action buttons

    @regression @positive @TC_AT002
    Scenario: TC_AT002 — Admin can create a new psychometric exam with questions
      When the admin clicks the Create New Exam button on the psychometric test page
      And the admin fills in the exam title and adds at least one question with answer options
      And the admin saves the new psychometric exam
      Then the new psychometric exam should appear on the psychometric test list page

    @regression @positive @TC_AT003
    Scenario: TC_AT003 — Admin can edit an existing psychometric exam and persist changes
      Given at least one psychometric exam exists on the platform
      When the admin clicks the Edit action on a psychometric exam
      And the admin modifies the exam details or questions
      And the admin saves the changes
      Then the updated psychometric exam should be reflected on the psychometric test list page

    @regression @positive @TC_AT004
    Scenario: TC_AT004 — Admin can delete a psychometric exam after confirming deletion
      Given at least one psychometric exam exists that can be safely deleted
      When the admin clicks the Delete action on a psychometric exam
      And the admin confirms the deletion
      Then the psychometric exam should be removed from the psychometric test list

  # ─────────────────────────────────────────────────────────────────────────
  #  Rule 2: Skill Tests
  # ─────────────────────────────────────────────────────────────────────────

  Rule: Admin manages skill test exams

    Background:
      Given the admin navigates to the Skill Test management page

    @smoke @positive @regression @TC_AT005
    Scenario: TC_AT005 — Skill Test page lists all skill exams with title, status, and action buttons
      Then skill exam cards should be displayed on the skill test management page
      And each skill exam card should display the exam title
      And each skill exam card should display an Active status badge
      And each skill exam card should display View, Edit, and Delete action buttons

    @regression @positive @TC_AT006
    Scenario: TC_AT006 — Admin can create a new skill test exam with questions and answers
      When the admin clicks the Create New Exam button on the skill test page
      And the admin fills in the skill exam details and adds at least one question with answer options
      And the admin saves the new skill exam
      Then the new skill exam should appear in the skill test list

    @regression @positive @TC_AT007
    Scenario: TC_AT007 — Admin can assign a skill test to a candidate or job
      Given at least one skill test exam exists on the platform
      When the admin selects a skill test
      And the admin configures and saves the assignment to a candidate or job
      Then the assignment should be saved
      And the assigned skill test should be visible to the assigned candidate on their dashboard

    @regression @positive @TC_AT008
    Scenario: TC_AT008 — Admin can view all questions and answers for a skill test exam
      Given at least one skill test exam exists on the platform
      When the admin clicks the View action on a skill test exam
      Then the skill test detail page should load
      And all questions should be displayed with their corresponding answer options
