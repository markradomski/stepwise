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
  const press = async (name: string) => {
    if (/^(Get a hint|Show an example|Show next step)$/.test(name) && !screen.queryByRole('button', { name })) {
      const launcher = screen.getByRole('button', { name: /^(Need help\?|Help)$/ });
      if (launcher.getAttribute('aria-expanded') === 'false') await user.click(launcher);
    }
    await user.click(screen.getByRole('button', { name }));
  };
  const solve = async (...steps: string[]) => {
    for (const step of steps) await submit(step);
  };
  return { user, input, submit, press, solve };
};

const heading = () => screen.getByRole('heading', { level: 2, name: /^Question \d of 3/ });
const helpSurface = () => screen.getByRole('region', { name: /^(Help|Prompt|Hint|Example)$/ });
const status = () => screen.getByRole('status');
const guide = () => screen.getByText('How Stepwise works').closest('details')!;
const metric = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
const learner = () => within(screen.getByRole('main'));

describe('three-question session', () => {
  it('starts at Question 1 of 3', () => {
    setup();
    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
  });

  it('offers Next question when Question 1 is solved, and keeps the working until then', async () => {
    const { solve } = setup();
    await solve('x + 2 = 6', 'x = 4');
    expect(screen.getByRole('button', { name: 'Next question' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Practice again' })).not.toBeInTheDocument();
    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(screen.getAllByText('Step accepted')).toHaveLength(2);
  });

  it('moves to Question 2 with fresh working, no old help and a collapsed guide', async () => {
    const { solve, press, input } = setup();
    await solve('3x + 2 = 18');
    await press('Get a hint');
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');

    expect(heading()).toHaveTextContent('Question 2 of 3');
    expect(screen.getByRole('math', { name: '2x + 5 = 17' })).toBeInTheDocument();
    expect(screen.queryByRole('math', { name: '3(x + 2) = 18' })).not.toBeInTheDocument();
    expect(screen.queryByRole('math', { name: 'x + 2 = 6' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText('Needs attention')).not.toBeInTheDocument();
    expect(screen.queryByText(/applies to everything/)).not.toBeInTheDocument();
    expect(status()).toBeEmptyDOMElement();
    expect(guide()).not.toHaveAttribute('open');
    expect(input()).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Check step' })).toBeDisabled();
  });

  it('runs all three questions to a calm completion', async () => {
    const { solve, press } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 12', 'x = 6');
    expect(status()).toHaveTextContent('Question complete');
    await press('Next question');
    expect(heading()).toHaveTextContent('Question 3 of 3');
    expect(screen.getByRole('math', { name: '4(x - 1) = 20' })).toBeInTheDocument();
    await solve('4x - 4 = 20', '4x = 24', 'x = 6');

    expect(status()).toHaveTextContent('Practice complete');
    expect(status()).toHaveTextContent('You finished all 3 questions.');
    expect(screen.getByRole('button', { name: 'Practice again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getAllByText('Step accepted')).toHaveLength(3);
  });

  it('works through question 3 by the divide-first path too', async () => {
    const { solve, press } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 12', 'x = 6');
    await press('Next question');
    await solve('x - 1 = 20/4', 'x - 1 = 5', 'x = 6');
    expect(status()).toHaveTextContent('Practice complete');
  });

  it('restarts the whole session with Practice again', async () => {
    const { solve, press, input } = setup(true);
    await solve('3x + 2 = 18');
    await press('Get a hint');
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 12', 'x = 6');
    await press('Next question');
    await solve('x - 1 = 5', 'x = 6');
    await press('Practice again');

    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(1);
    expect(status()).toBeEmptyDOMElement();
    expect(guide()).toHaveAttribute('open');
    expect(input()).toHaveFocus();
    expect(metric('Completed')).toHaveTextContent('0');
    expect(metric('Independent solutions')).toHaveTextContent('0');
    expect(metric('Hints requested')).toHaveTextContent('0');
    expect(metric('Mastery estimate')).toHaveTextContent('0.50');
  });

  it('manages focus after Next question, final completion and Practice again', async () => {
    const { solve, press, input } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    await press('Next question');
    expect(input()).toHaveFocus();

    await solve('2x = 12', 'x = 6');
    await press('Next question');
    await solve('x - 1 = 5', 'x = 6');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Practice again' })).toHaveFocus());
    await press('Practice again');
    expect(input()).toHaveFocus();
  });

  it('does not activate the next action when the last step is submitted with Enter', async () => {
    const { user, input, press } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    await user.type(input(), 'x = 4{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    expect(heading()).toHaveTextContent('Question 1 of 3');

    await press('Next question');
    await user.type(input(), '2x = 12{Enter}');
    await user.type(input(), 'x = 6{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    expect(heading()).toHaveTextContent('Question 2 of 3');

    await press('Next question');
    await user.type(input(), 'x - 1 = 5{Enter}');
    await user.type(input(), 'x = 6{Enter}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Practice again' })).toHaveFocus());
    expect(status()).toHaveTextContent('Practice complete');
  });
});

describe('help across questions', () => {
  it('still diagnoses Question 1 mistakes with their own help', async () => {
    const { solve, press } = setup();
    await solve('3x + 2 = 18');
    expect(status()).toHaveTextContent('Check what the 3 multiplies inside the brackets.');
    await press('Get a hint');
    expect(helpSurface()).toHaveTextContent('The 3 applies to everything inside the brackets.');
  });

  it('gives Question 2 its own feedback, hint, example and next step', async () => {
    const { solve, press } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 22');
    expect(status()).toHaveTextContent('Check what happens when you undo the +5.');
    await press('Get a hint');
    expect(helpSurface()).toHaveTextContent('What operation undoes +5?');
    await press('Show an example');
    const example = within(screen.getByRole('group', { name: 'Worked example' }));
    expect(example.getByRole('math', { name: 'y + 3 = 8' })).toBeInTheDocument();
    expect(example.getByRole('math', { name: 'y = 5' })).toBeInTheDocument();
    await press('Show next step');
    expect(screen.getByText('Suggested next step')).toBeInTheDocument();
    expect(screen.getByRole('math', { name: '2x = 12' })).toBeInTheDocument();
    await solve('x = 6');
    expect(status()).toHaveTextContent('Question complete');
  });

  it('gives Question 3 the 4-specific partial-distribution help', async () => {
    const { solve, press } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 12', 'x = 6');
    await press('Next question');
    await solve('4x - 1 = 20');
    expect(status()).toHaveTextContent('Check what the 4 multiplies inside the brackets.');
    await press('Get a hint');
    expect(helpSurface()).toHaveTextContent('The 4 applies to everything inside the brackets.');
    await solve('4x - 1 = 20');
    await press('Show an example');
    const example = within(screen.getByRole('group', { name: 'Worked example' }));
    expect(example.getByRole('math', { name: '2(y - 3)' })).toBeInTheDocument();
    expect(example.getByRole('math', { name: '2y - 6' })).toBeInTheDocument();
  });

  it('keeps the skipped-answer behaviour on Question 2', async () => {
    const { solve, press } = setup();
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('x = 6');
    expect(status()).toHaveTextContent('That answer is correct. Can you show one step that gets you there?');
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
    await solve('2x = 12', 'x = 6');
    expect(screen.getByRole('button', { name: 'Next question' })).toBeInTheDocument();
  });
});

describe('hidden mastery', () => {
  it('never shows a mastery estimate, score or percentage to the learner', async () => {
    const { solve, press } = setup();
    await solve('3x + 2 = 18');
    await press('Get a hint');
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('2x = 12', 'x = 6');
    await press('Next question');
    await solve('x - 1 = 5', 'x = 6');
    expect(learner().queryByText(/mastery|score|confidence|ability|%|\b0\.\d+\b/i)).toBeNull();
    expect(screen.queryByText(/mastery/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/round/i)).not.toBeInTheDocument();
  });

  it('shows the session state and mastery estimate in the inspector only', async () => {
    const { solve, press } = setup(true);
    expect(metric('Question')).toHaveTextContent('1 / 3');
    expect(metric('Mastery estimate')).toHaveTextContent('0.50');

    await solve('3x + 2 = 18');
    await press('Get a hint');
    expect(metric('Hints requested')).toHaveTextContent('1');
    await solve('x + 2 = 6', 'x = 4');
    expect(metric('Completed')).toHaveTextContent('1');
    expect(metric('Independent solutions')).toHaveTextContent('1');
    expect(metric('Mastery estimate')).toHaveTextContent('0.58');

    await press('Next question');
    expect(metric('Question')).toHaveTextContent('2 / 3');
    expect(metric('Completed')).toHaveTextContent('1');
    expect(metric('Hints requested')).toHaveTextContent('1');
    expect(metric('Attempt')).toHaveTextContent('0');
    expect(metric('Current expression')).toHaveTextContent('2x + 5 = 17');
  });

  it('records skipped reasoning and example use, and gives a helped session a lower estimate', async () => {
    const { solve, press } = setup(true);
    await solve('x + 2 = 6', 'x = 4');
    await press('Next question');
    await solve('x = 6');
    expect(metric('Skipped reasoning')).toHaveTextContent('1');
    await solve('2x = 22');
    await press('Get a hint');
    await press('Show an example');
    expect(metric('Examples requested')).toHaveTextContent('1');
    await press('Show next step');
    expect(metric('Next-step reveals')).toHaveTextContent('1');
    await solve('x = 6');
    expect(metric('Independent solutions')).toHaveTextContent('1');
    expect(metric('Mastery estimate')).toHaveTextContent('0.59');
  });
});
