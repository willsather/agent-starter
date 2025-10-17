export interface FriendAdvice {
  question: string;
  response: string;
}

export const getFriendAdvice = (question: string): FriendAdvice => {
  const friendResponses = [
    "Go with something casual and comfortable!",
    "You should definitely dress up a bit today.",
    "Layer up, it might get chilly later.",
    "Bright colors always look good on you!",
    "Keep it simple - less is more.",
    "Don't forget to accessorize!",
  ];

  const response =
    friendResponses[Math.floor(Math.random() * friendResponses.length)];

  return {
    question,
    response,
  };
};

export const formatFriendAdvice = (advice: FriendAdvice): string => {
  return `Friend's advice about "${advice.question}": ${advice.response}`;
};
