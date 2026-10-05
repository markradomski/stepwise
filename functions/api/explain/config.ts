import { adapterFor, type PagesContext } from '../_adapter';

export const onRequest = ({ env }: PagesContext) => adapterFor(env).config();
