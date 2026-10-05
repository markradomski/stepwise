import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PracticeView } from './PracticeView';

const setup = (showInspector = false) => {
  const user = userEvent.setup();
  render(<PracticeView showInspector={showInspector} />);
  const input = () => screen.getByRole('textbox', { name: 'Write the equation after your next step' });
  const submit = async (value: string) => {
    await user.clear(input());
    await user.type(input(), value);
    await user.click(screen.getByRole('button', { name: 'Check step' }));
  };
  const press = (name: string) => user.click(screen.getByRole('button', { name }));
  return { user, input, submit, press };
};

const mistake = '3x + 2 = 18';
const learnerColumn = () => within(screen.getByRole('main'));
const status = () => screen.getByRole('status');

describe('session progress', () => {
  it('starts at the first of three questions with no round language', () => {
    render(<PracticeView />);
    expect(screen.getByRole('heading', { level: 2, name: 'Question 1 of 3' })).toBeInTheDocument();
    expect(screen.queryByText(/round/i)).not.toBeInTheDocument();
  });

  it('keeps the explanation and the core interaction on screen', () => {
    render(<PracticeView />);
    expect(screen.getByText('How Stepwise works')).toBeInTheDocument();
    expect(screen.getByText('Write the equation, not the operation.')).toBeInTheDocument();
    expect(screen.getByLabelText('Write the equation after your next step')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
  });
});

describe('interaction contract', () => {
  it('tells a first-time learner exactly what to write', () => {
    const { input } = setup();
    expect(screen.getByText('Solve the equation one step at a time.')).toBeInTheDocument();
    expect(screen.getByLabelText('Write the equation after your next step')).toBe(input());
    expect(screen.getByRole('button', { name: 'Check step' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Check$/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Your next step')).not.toBeInTheDocument();
  });

  it('shows the given equation as the first line of the working sequence', () => {
    setup();
    const working = screen.getByRole('region', { name: 'Your working' });
    const lines = within(within(working).getByRole('list', { name: 'Working so far' })).getAllByRole('listitem');
    expect(lines).toHaveLength(1);
    expect(within(lines[0]).getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
    expect(within(lines[0]).getByText('Given')).toBeInTheDocument();
    expect(within(working).getByRole('textbox')).toBeInTheDocument();
    expect(screen.getAllByRole('math', { name: '3(x + 2) = 18' })).toHaveLength(1);
  });

  it('has no line-number gutter beside the input', () => {
    const { input } = setup();
    expect(input().parentElement?.children).toHaveLength(1);
    expect(screen.queryByText(/^\d+$/)).not.toBeInTheDocument();
  });

  it('explains the input convention on first load, separately from the maths help', () => {
    setup();
    const guide = screen.getByText('How Stepwise works').closest('details')!;
    expect(guide).toHaveAttribute('open');
    const text = within(guide);
    expect(text.getByText(/one line of working at a time/i)).toBeInTheDocument();
    expect(text.getByText(/the equation as it looks after one operation/i)).toBeInTheDocument();
    expect(text.getByRole("math", { name: "2x + 4 = 10" })).toBeInTheDocument();
    expect(text.getByRole('math', { name: '2x = 6' })).toBeInTheDocument();
    expect(text.getByText('Write the equation, not the operation.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /hint/i })).not.toBeInTheDocument();
  });

  it('tucks the explanation away once the learner has accepted working', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    expect(screen.getByText('How Stepwise works').closest('details')).not.toHaveAttribute('open');
  });

  it('keeps the explanation open while the learner is still getting a first step right', async () => {
    const { submit } = setup();
    await submit('banana');
    expect(screen.getByText('How Stepwise works').closest('details')).toHaveAttribute('open');
  });
});

describe('guided simplification', () => {
  it('accepts an unsimplified step, keeps it visible, and asks the learner to simplify it', async () => {
    const { input, submit } = setup();
    await submit('x + 2 = 18/3');

    const working = within(screen.getByRole('list', { name: 'Working so far' }));
    expect(working.getByRole('math', { name: 'x + 2 = 18/3' })).toBeInTheDocument();
    expect(working.getByText('Step accepted')).toBeInTheDocument();
    expect(status()).toHaveTextContent('That step works.');
    expect(status()).toHaveTextContent('Can you simplify 18/3?');
    expect(screen.queryByText(/needs attention|not recognised|have another look/i)).not.toBeInTheDocument();
    expect(learnerColumn().queryByText(/equivalent|canonical|simplificationAvailable/i)).toBeNull();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('places the next input directly after the accepted line', async () => {
    const { input, submit } = setup();
    await submit('x + 2 = 18/3');
    const list = screen.getByRole('list', { name: 'Working so far' });
    expect(list.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const lastLine = within(list).getAllByRole('listitem').at(-1)!;
    const between = [...document.querySelectorAll('main *')].filter(
      (node) =>
        lastLine.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING &&
        node.compareDocumentPosition(input()) & Node.DOCUMENT_POSITION_FOLLOWING &&
        !lastLine.contains(node) &&
        !node.contains(input()) &&
        !node.contains(lastLine) &&
        node.matches('input, button, h2, summary'),
    );
    expect(between).toHaveLength(0);
  });

  it('accepts the simplified line and lets the learner continue to the answer', async () => {
    const { submit } = setup();
    await submit('x + 2 = 18/3');
    await submit('x + 2 = 6');
    expect(status()).toBeEmptyDOMElement();
    const lines = within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(screen.getByRole('math', { name: 'x + 2 = 18/3' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();

    await submit('x = 4');
    expect(status()).toHaveTextContent('Question complete');
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(4);
  });

  it('guides other numeric simplifications', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    await submit('3x = 18 - 6');
    expect(status()).toHaveTextContent('Can you simplify 18 - 6?');
  });

  it('does not add guidance to a step that is already simplified', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    expect(status()).toBeEmptyDOMElement();
  });

  it('keeps the skipped, misconception and unrecognised responses distinct', async () => {
    const { submit } = setup();
    await submit('x = 4');
    expect(status()).toHaveTextContent('That answer is correct. Can you show one step that gets you there?');
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    await submit('3x + 2 = 18');
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    await submit('6 + 3x = 18');
    expect(status()).toHaveTextContent('I can’t quite match that step yet.');
    expect(screen.getByText('Not recognised yet')).toBeInTheDocument();
  });
});

describe('practice interaction', () => {
  it('disables Check while the input is empty', async () => {
    const { user, input } = setup();
    const check = screen.getByRole('button', { name: 'Check step' });
    expect(check).toBeDisabled();
    await user.type(input(), '   ');
    expect(check).toBeDisabled();
    await user.type(input(), '3x + 6 = 18');
    expect(check).toBeEnabled();
  });

  it('adds a valid step to the working history, clears the input and refocuses it', async () => {
    const { input, submit } = setup();
    await submit('3x+6=18');
    expect(screen.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(screen.getByText('Step accepted')).toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
  });

  it('submits with Enter', async () => {
    const { user, input } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();
  });

  it('keeps rejected work visible with gentle feedback and keeps focus in the input', async () => {
    const { input, submit } = setup();
    await submit(mistake);
    expect(screen.getByRole('math', { name: mistake })).toBeInTheDocument();
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByRole('button', { name: 'Get a hint' })).toBeInTheDocument();
    expect(input()).toHaveValue(mistake);
    expect(input()).toHaveFocus();
  });

  it('shows stronger feedback when the same mistake is repeated, without revealing help early', async () => {
    const { submit } = setup();
    await submit(mistake);
    await submit(mistake);
    expect(status()).toHaveTextContent('Remember: the number outside the brackets multiplies every term inside.');
    expect(screen.getByRole('button', { name: 'Get a hint' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show an example' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
  });

  it('moves to Show an example once the hint has been seen and the mistake repeats', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    await submit(mistake);
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View hint' })).toBeInTheDocument();
    expect(screen.queryByText('The 3 applies to everything inside the brackets.')).not.toBeInTheDocument();
  });

  it('moves to Show next step once the example has been seen and the mistake repeats', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    await press('Show an example');
    await submit(mistake);
    expect(screen.getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View example' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
  });

  it('reopens seen help quietly without changing session metrics', async () => {
    const { submit, press } = setup(true);
    await submit(mistake);
    await press('Get a hint');
    await submit(mistake);
    const before = screen.getByText('Hints requested', { selector: 'dt' }).nextElementSibling?.textContent;
    await press('View hint');
    expect(status()).toHaveTextContent('The 3 applies to everything inside the brackets.');
    expect(screen.queryByRole('button', { name: 'View hint' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
    expect(screen.getByText('Hints requested', { selector: 'dt' }).nextElementSibling?.textContent).toBe(before);
    expect(status()).not.toHaveFocus();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });

  it('labels prompt, hint and example help distinctly and never uses internal terminology', async () => {
    const { submit, press } = setup();
    await press('Need help?');
    expect(screen.getByText('Prompt')).toBeInTheDocument();
    await submit(mistake);
    await press('Get a hint');
    expect(screen.getByText('Hint')).toBeInTheDocument();
    await press('Show an example');
    expect(screen.getByRole('group', { name: 'Worked example' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).queryByText(/assistance level|scaffold level|intervention level|diagnosis confidence|escalation stage/i),
    ).toBeNull();
  });

  it('offers a single forward action at any time', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    await submit(mistake);
    const labels = ['Need help?', 'Get a hint', 'Show an example', 'Show next step'];
    const forwards = labels.filter((label) => screen.queryByRole('button', { name: label }));
    expect(forwards).toEqual(['Show an example']);
  });


  it.each([
    ['distribute first', ['3x + 6 = 18', '3x = 12', 'x = 4'], 3],
    ['divide first', ['x + 2 = 6', 'x = 4'], 2],
  ])('completes by the %s path and keeps the working history', async (_name, steps, count) => {
    const { submit } = setup();
    for (const step of steps) await submit(step);
    expect(screen.getByRole('heading', { level: 2, name: /Question 1 of 3/ })).toBeInTheDocument();
    expect(status()).toHaveTextContent('Question complete');
    expect(screen.getAllByText('Step accepted')).toHaveLength(count);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/mastery|%/i)).not.toBeInTheDocument();
  });
});

describe('equivalent forms', () => {
  it('accepts a division written out and keeps it as entered', async () => {
    const { input, submit } = setup();
    await submit('(x + 2) = 18/3');

    const steps = within(screen.getByRole('list', { name: 'Working so far' }));
    expect(steps.getByRole('math', { name: '(x + 2) = 18/3' })).toBeInTheDocument();
    expect(steps.getByText('Step accepted')).toBeInTheDocument();
    expect(screen.queryByRole('math', { name: 'x + 2 = 6' })).not.toBeInTheDocument();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText('Not recognised yet')).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('That step works.');
    expect(status()).toHaveTextContent('Can you simplify 18/3?');
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();

    await submit('x = 4');
    expect(status()).toHaveTextContent('Question complete');
    expect(screen.getByRole('math', { name: '(x + 2) = 18/3' })).toBeInTheDocument();
  });

  it('completes when the last step is an unsimplified division', async () => {
    const { submit } = setup();
    await submit('3x + 6 = 18');
    await submit('3x = 12');
    await submit('x = 12/3');
    expect(status()).toHaveTextContent('Question complete');
    expect(screen.getByRole('math', { name: 'x = 12/3' })).toBeInTheDocument();
    expect(screen.getAllByText('Step accepted')).toHaveLength(3);
  });
});

describe('unrecognised steps', () => {
  it('keeps the step visible, says honestly that it was not matched, and does not claim an error', async () => {
    const { input, submit } = setup();
    await submit('6 + 3x = 18');

    expect(screen.getByRole('math', { name: '6 + 3x = 18' })).toBeInTheDocument();
    expect(screen.getByText('Not recognised yet')).toBeInTheDocument();
    expect(status()).toHaveTextContent('I can’t quite match that step yet.');
    expect(status()).toHaveTextContent('Check whether both sides still represent the same value.');
    expect(screen.queryByText(/have another look|needs attention|wrong|incorrect|invalid/i)).not.toBeInTheDocument();
    expect(input()).toHaveValue('6 + 3x = 18');
    expect(input()).toHaveFocus();
  });

  it('offers only a generic hint, tied to the current step', async () => {
    const { input, submit, press } = setup();
    await submit('6 + 3x = 18');
    expect(screen.getByRole('button', { name: 'Need help?' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /example|next step/i })).not.toBeInTheDocument();

    await press('Need help?');
    expect(status()).toHaveTextContent('Think about how you could make the equation simpler.');
    expect(screen.queryByRole('button', { name: /help|hint|example|next step/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(input()).toHaveFocus();

    await submit('banana');
    expect(screen.queryByRole('button', { name: /example|next step/i })).not.toBeInTheDocument();
  });

  it('uses the hint for whichever supported step the learner is on', async () => {
    const { submit, press } = setup();
    await submit('3x + 6 = 18');
    await submit('banana');
    await press('Need help?');
    expect(status()).toHaveTextContent('What operation would undo the +6?');
  });

  it('treats nonsense the same way, without inventing a diagnosis', async () => {
    const { submit } = setup(true);
    await submit('banana');
    expect(status()).toHaveTextContent('I can’t quite match that step yet.');
    expect(screen.getByText('Detected misconception', { selector: 'dt' }).nextElementSibling).toHaveTextContent('None');
    expect(screen.getByText('Source', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Generic');
  });

  it('clears the fallback help once the learner returns to a supported step', async () => {
    const { submit, press } = setup();
    await submit('6 + 3x = 18');
    await press('Need help?');
    await submit('3x + 6 = 18');
    expect(screen.queryByText('Think about how you could make the equation simpler', { exact: false })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need help?' })).toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
  });

  it('still diagnoses a recognised misconception with its specific help', async () => {
    const { submit, press } = setup();
    await submit('3x + 2 = 18');
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    expect(screen.getByText('Needs attention')).toBeInTheDocument();
    await press('Get a hint');
    expect(status()).toHaveTextContent('The 3 applies to everything inside the brackets.');
  });
});

describe('progressive help', () => {
  it('reveals a conceptual hint without giving the answer, and keeps the attempt and focus', async () => {
    const { input, submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    expect(status()).toHaveTextContent('The 3 applies to everything inside the brackets.');
    expect(learnerColumn().queryByRole('math', { name: '3x + 6 = 18' })).not.toBeInTheDocument();
    expect(input()).toHaveValue(mistake);
    expect(input()).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Get a hint' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show an example' })).toBeInTheDocument();
  });

  it('shows a worked example on a different expression that does not solve the question', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    await press('Show an example');

    const example = within(screen.getByRole('group', { name: 'Worked example' }));
    expect(example.getByRole('math', { name: '2(y + 4)' })).toBeInTheDocument();
    expect(example.getByRole('math', { name: '2y + 8' })).toBeInTheDocument();
    expect(example.getByText('The number outside the brackets multiplies each term inside.')).toBeInTheDocument();
    expect(screen.queryByRole('math', { name: '3x + 6 = 18' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
  });

  it('only offers the next step after the example has been seen', async () => {
    const { submit, press } = setup();
    await submit(mistake);
    expect(screen.queryByRole('button', { name: 'Show next step' })).not.toBeInTheDocument();
    await press('Get a hint');
    expect(screen.queryByRole('button', { name: 'Show next step' })).not.toBeInTheDocument();
    await press('Show an example');
    expect(screen.getByRole('button', { name: 'Show next step' })).toBeInTheDocument();
  });

  it('inserts the next step as a labelled system-provided step and lets the learner carry on', async () => {
    const { input, submit, press } = setup();
    await submit(mistake);
    await press('Get a hint');
    await press('Show an example');
    await press('Show next step');

    const steps = within(screen.getByRole('list', { name: 'Working so far' }));
    expect(steps.getAllByRole('listitem')).toHaveLength(2);
    expect(steps.getByRole('math', { name: '3x + 6 = 18' })).toBeInTheDocument();
    expect(steps.getByText('Suggested next step')).toBeInTheDocument();
    expect(steps.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Given'),
      expect.stringContaining('Suggested next step'),
    ]);
    expect(steps.queryByText('Step accepted')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();

    await submit('3x = 12');
    await submit('x = 4');
    expect(status()).toHaveTextContent('Question complete');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
  });

  it('acknowledges a correct final answer from the start without completing', async () => {
    const { input, submit } = setup();
    await submit('x = 4');
    expect(status()).toHaveTextContent('That answer is correct. Can you show one step that gets you there?');
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText('Question complete')).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(1);
    expect(input()).toBeInTheDocument();
    expect(input()).toHaveFocus();

    await submit('x + 2 = 6');
    await submit('x = 4');
    expect(status()).toHaveTextContent('Question complete');
  });

  it('keeps diagnostic and system language out of the learner UI', async () => {
    const { submit, press } = setup(true);
    await submit(mistake);
    await press('Get a hint');
    await submit(mistake);
    await press('Show an example');
    await press('Show next step');
    await submit('x = 4');
    expect(
      learnerColumn().queryByText(/partial distribution|misconception|mastery|intervention|hint level|wrong|incorrect|failed/i),
    ).toBeNull();
  });
});

describe('completing a question', () => {
  it('moves focus to Next question and keeps the working visible', async () => {
    const { submit } = setup();
    await submit('x + 2 = 6');
    await submit('x = 4');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 2, name: /Question 1 of 3/ })).toBeInTheDocument();
  });

  it('does not advance when the final step is submitted with Enter', async () => {
    const { user, input } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    await user.type(input(), 'x = 4{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    expect(status()).toHaveTextContent('Question complete');
    expect(screen.getByRole('heading', { level: 2, name: /Question 1 of 3/ })).toBeInTheDocument();
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
  });
});

describe('inspector', () => {
  const value = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;

  it('reflects the real help and exposure state through the escalation', async () => {
    const { submit, press } = setup(true);
    expect(value('Hint')).toHaveTextContent('Available');
    expect(value('Worked example')).toHaveTextContent('Hidden');
    expect(value('Source')).toHaveTextContent('None');
    expect(value('Forward action')).toHaveTextContent('Need help?');
    expect(value('Last validation')).toHaveTextContent('None');

    await submit(mistake);
    expect(value('Detected misconception')).toHaveTextContent('Partial distribution');
    expect(value('Last validation')).toHaveTextContent('Misconception');
    expect(value('Forward action')).toHaveTextContent('Get a hint');
    expect(value('Worked example')).toHaveTextContent('Hidden');

    await press('Get a hint');
    expect(value('Hint')).toHaveTextContent('Visible');
    expect(value('Hint seen')).toHaveTextContent('Yes');
    expect(value('Forward action')).toHaveTextContent('Show an example');
    expect(value('Worked example')).toHaveTextContent('Available');

    await submit(mistake);
    expect(value('Attempt')).toHaveTextContent('2');
    expect(value('Repeated misconception count')).toHaveTextContent('2');
    expect(value('Repeated difficulty')).toHaveTextContent('2');
    expect(value('Next solution step')).toHaveTextContent('Hidden');

    await press('Show an example');
    expect(value('Worked example')).toHaveTextContent('Visible');
    expect(value('Next solution step')).toHaveTextContent('Available');
    expect(value('Hint level')).toHaveTextContent('3 / 3');
    expect(value('Forward action')).toHaveTextContent('Show next step');

    await press('Show next step');
    expect(value('Next solution step')).toHaveTextContent('Visible');
    expect(value('Mastery')).toHaveTextContent('Hidden');
    expect(value('Misconception label')).toHaveTextContent('Hidden');
    expect(value('Mastery estimate')).toHaveTextContent('0.50');
  });

  it('distinguishes exact, equivalent and unrecognised steps', async () => {
    const { submit } = setup(true);
    await submit('x+2=18/3');
    expect(value('Last validation')).toHaveTextContent('Valid, direct');
    expect(value('Recognition')).toHaveTextContent('Equivalent form');
    expect(value('Submitted')).toHaveTextContent('x + 2 = 18/3');
    expect(value('Canonical state')).toHaveTextContent('x + 2 = 6');
    expect(value('Detected misconception')).toHaveTextContent('None');

    await submit('x = 4');
    expect(value('Recognition')).toHaveTextContent('Exact match');
    expect(screen.queryByText('Canonical state', { selector: 'dt' })).not.toBeInTheDocument();
  });

  it('shows an unrecognised step as undiagnosed with generic help', async () => {
    const { submit, press } = setup(true);
    await submit('6 + 3x = 18');
    expect(value('Last validation')).toHaveTextContent('Unrecognised');
    expect(value('Detected misconception')).toHaveTextContent('None');
    expect(value('Source')).toHaveTextContent('Generic');
    expect(value('Hint')).toHaveTextContent('Available');
    expect(value('Worked example')).toHaveTextContent('Hidden');
    expect(value('Misconception label')).toHaveTextContent('Hidden');
    expect(value('Next solution step')).toHaveTextContent('Hidden');

    await press('Need help?');
    expect(value('Hint')).toHaveTextContent('Visible');
    expect(value('Prompt seen')).toHaveTextContent('Yes');
    expect(value('Worked example')).toHaveTextContent('Hidden');
    expect(value('Next solution step')).toHaveTextContent('Hidden');
  });

  it('shows that a skipped answer is valid but not complete', async () => {
    const { submit } = setup(true);
    await submit('x = 4');
    expect(value('Last validation')).toHaveTextContent('Valid, skipped steps');
    expect(value('Detected misconception')).toHaveTextContent('None');
    expect(value('Attempt')).toHaveTextContent('0');
  });
});
