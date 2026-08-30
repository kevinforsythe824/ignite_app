import type { FeedbackCategory } from '../../feedback/domain/feedbackCategory';

export type ProfileStackParamList = {
  ProfileHome: undefined;
  Settings: undefined;
  EditName: undefined;
  ChangeEmail: undefined;
  ChangePassword: undefined;
  HelpAndFeedback: undefined;
  FeedbackCompose: { category: FeedbackCategory };
  About: undefined;
};
