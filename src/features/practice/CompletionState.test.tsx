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
const status = () => screen.getByRole('status');
const metric = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling;
const helpLabels = /need help|get a hint|show an example|show next step/i;
const solveOne = ['x + 2 = 6', 'x = 4'];
const solveTwo = ['2x = 12', 'x = 6'];
const solveThree = ['x - 1 = 5', 'x = 6'];

describe('question complete', () => {
  it('stops looking editable and offers one clear next action', async () => {
    const { solve } = setup();
    await solve(...solveOne);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check step' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: helpLabels })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Worked example' })).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('Question complete');
    expect(status()).toHaveTextContent('You finished this question.');
    expect(within(status()).getByRole('button', { name: 'Next question' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Next question']);
  });

  it('keeps the full working visible, and the progress truthful, until Next question', async () => {
    const { solve } = setup();
    await solve(...solveOne);
    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(heading()).not.toHaveTextContent(/complete/i);
    const lines = within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem');
    expect(lines).toHaveLength(3);
    expect(screen.getByRole('math', { name: '3(x + 2) = 18' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'x + 2 = 6' })).toBeInTheDocument();
    expect(screen.getByRole('math', { name: 'x = 4' })).toBeInTheDocument();
  });

  it('places the completion after the working, where the input used to be', async () => {
    const { solve } = setup();
    await solve(...solveOne);
    const list = screen.getByRole('list', { name: 'Working so far' });
    expect(list.compareDocumentPosition(status()) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('region', { name: 'Your working' })).toContainElement(status());
  });

  it('drops help that was open when the question was solved', async () => {
    const { solve, press } = setup();
    await solve('3x + 2 = 18');
    await press('Get a hint');
    await solve(...solveOne);
    expect(screen.queryByText(/applies to everything/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: helpLabels })).not.toBeInTheDocument();
  });

  it('moves to the next question with fresh state and a focused input, for both transitions', async () => {
    const { solve, press, input } = setup(true);
    await solve('3x + 2 = 18');
    await press('Get a hint');
    await solve(...solveOne);
    await press('Next question');

    expect(heading()).toHaveTextContent('Question 2 of 3');
    expect(input()).toHaveValue('');
    expect(input()).toHaveFocus();
    expect(screen.queryByRole('math', { name: 'x + 2 = 6' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/Question complete/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Need help?' })).toBeInTheDocument();
    expect(metric('Question status')).toHaveTextContent('In progress');
    expect(metric('Hints requested')).toHaveTextContent('1');
    expect(screen.getByText('How Stepwise works').closest('details')).not.toHaveAttribute('open');

    await solve(...solveTwo);
    expect(heading()).toHaveTextContent('Question 2 of 3');
    expect(status()).toHaveTextContent('Question complete');
    await press('Next question');
    expect(heading()).toHaveTextContent('Question 3 of 3');
    expect(input()).toHaveFocus();
    expect(screen.getByText('How Stepwise works').closest('details')).not.toHaveAttribute('open');
  });
});

describe('practice complete', () => {
  const finish = async (ctx: ReturnType<typeof setup>) => {
    await ctx.solve(...solveOne);
    await ctx.press('Next question');
    await ctx.solve(...solveTwo);
    await ctx.press('Next question');
    await ctx.solve(...solveThree);
  };

  it('shows the final state, with no next question and nothing to type', async () => {
    const ctx = setup();
    await finish(ctx);
    expect(heading()).toHaveTextContent('Question 3 of 3');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(status()).toHaveTextContent('Practice complete');
    expect(status()).toHaveTextContent('You finished all 3 questions.');
    expect(screen.getByRole('button', { name: 'Practice again' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next question' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: helpLabels })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Practice again']);
  });

  it('does not show the mastery estimate, counts or analytics to the learner', async () => {
    const ctx = setup();
    await ctx.solve('3x + 2 = 18');
    await finish(ctx);
    expect(within(screen.getByRole('main')).queryByText(/mastery|estimate|score|\b0\.\d+\b|%|misconception|requested/i)).toBeNull();
  });

  it('shows session completion in the inspector only', async () => {
    const ctx = setup(true);
    await finish(ctx);
    expect(metric('Question status')).toHaveTextContent('Complete');
    expect(metric('Completed')).toHaveTextContent('3');
    expect(metric('Mastery estimate')).toHaveTextContent('0.80');
  });

  it('restarts everything with Practice again', async () => {
    const ctx = setup(true);
    await ctx.solve('3x + 2 = 18');
    await ctx.press('Get a hint');
    await ctx.solve('x + 2 = 6', 'x = 4');
    await ctx.press('Next question');
    await ctx.solve(...solveTwo);
    await ctx.press('Next question');
    await ctx.solve(...solveThree);
    await ctx.press('Practice again');

    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(screen.getByText('How Stepwise works').closest('details')).toHaveAttribute('open');
    expect(ctx.input()).toHaveValue('');
    expect(ctx.input()).toHaveFocus();
    expect(within(screen.getByRole('list', { name: 'Working so far' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/Practice complete/)).not.toBeInTheDocument();
    expect(metric('Completed')).toHaveTextContent('0');
    expect(metric('Hints requested')).toHaveTextContent('0');
    expect(metric('Mastery estimate')).toHaveTextContent('0.50');
    expect(metric('Question status')).toHaveTextContent('In progress');
  });
});

describe('completion keyboard flow', () => {
  it('moves focus to the completion action after the key event, and needs a second Enter to use it', async () => {
    const { user, input } = setup();
    await user.type(input(), 'x + 2 = 6{Enter}');
    await user.type(input(), 'x = 4{Enter}');

    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(status()).toHaveTextContent('Question complete');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Next question' })).toHaveFocus());
    expect(heading()).toHaveTextContent('Question 1 of 3');

    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent('Question 2 of 3');
    expect(input()).toHaveFocus();
  });

  it('does the same for the final question and Practice again', async () => {
    const { user, input, solve, press } = setup();
    await solve(...solveOne);
    await press('Next question');
    await solve(...solveTwo);
    await press('Next question');
    await user.type(input(), 'x - 1 = 5{Enter}');
    await user.type(input(), 'x = 6{Enter}');

    expect(status()).toHaveTextContent('Practice complete');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Practice again' })).toHaveFocus());
    expect(heading()).toHaveTextContent('Question 3 of 3');

    await user.keyboard('{Enter}');
    expect(heading()).toHaveTextContent('Question 1 of 3');
    expect(input()).toHaveFocus();
  });
});
