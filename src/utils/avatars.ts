export const CHARACTER_AVATARS = [
    { id: 'neutral_1', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Felix', label: 'Happy' },
    { id: 'neutral_2', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Aneka', label: 'Smile' },
    { id: 'neutral_3', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jack', label: 'Cool' },
    { id: 'neutral_4', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Caleb', label: 'Wink' },
    { id: 'neutral_5', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Oliver', label: 'Neutral' },
    { id: 'neutral_6', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Milo', label: 'Surprised' },
    { id: 'neutral_7', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jasper', label: 'Calm' },
    { id: 'neutral_8', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Xavier', label: 'Playful' },
    { id: 'neutral_9', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Ryker', label: 'Stern' },
    { id: 'neutral_10', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Kaden', label: 'Charming' },
    { id: 'neutral_11', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Mimi', label: 'Joy' },
    { id: 'neutral_12', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Sasha', label: 'Wonder' },
    { id: 'neutral_13', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Zoe', label: 'Blush' },
    { id: 'neutral_14', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Luna', label: 'Dreamy' },
    { id: 'neutral_15', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Bella', label: 'Kind' },
    { id: 'neutral_16', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Cleo', label: 'Sly' },
    { id: 'neutral_17', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Aria', label: 'Bright' },
    { id: 'neutral_18', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Nova', label: 'Star' },
    { id: 'neutral_19', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Iris', label: 'Peace' },
    { id: 'neutral_20', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Maya', label: 'Love' },
    { id: 'neutral_21', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Leo', label: 'Bold' },
    { id: 'neutral_22', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Finn', label: 'Brave' },
    { id: 'neutral_23', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Toby', label: 'Glee' },
    { id: 'neutral_24', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Ruby', label: 'Sweet' },
    { id: 'neutral_25', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Jade', label: 'Grace' },
    { id: 'neutral_26', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Reed', label: 'Sturdy' },
    { id: 'neutral_27', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Sage', label: 'Wise' },
    { id: 'neutral_28', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Cole', label: 'Sharp' },
    { id: 'neutral_29', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Skye', label: 'Airy' },
    { id: 'neutral_30', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Quinn', label: 'Unique' },
    { id: 'neutral_31', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Ash', label: 'Smoky' },
    { id: 'neutral_32', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Pip', label: 'Tiny' },
    { id: 'neutral_33', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Rex', label: 'Dino' },
    { id: 'neutral_34', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Kit', label: 'Foxy' },
    { id: 'neutral_35', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Max', label: 'Peak' },
    { id: 'neutral_36', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Sam', label: 'Unity' },
    { id: 'neutral_37', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Ari', label: 'Gold' },
    { id: 'neutral_38', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Lee', label: 'Flow' },
    { id: 'neutral_39', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Sid', label: 'Rad' },
    { id: 'neutral_40', url: 'https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=Van', label: 'Swift' },
];

/**
 * Generates a DiceBear avatar URL based on a seed (usually name or ID).
 * Also supports direct URLs to character avatars.
 * Falls back to a unique expression of the neutral character for each user.
 */
export const getAvatarUrl = (seedOrUrl: string) => {
  if (!seedOrUrl) return `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=default&backgroundColor=FDB813`;
  
  if (seedOrUrl.startsWith('http') || seedOrUrl.startsWith('/assets/')) {
    return seedOrUrl;
  }

  // Use the seed (e.g. userId) to give each user a unique expression of the same character style
  const encodedSeed = encodeURIComponent(seedOrUrl);
  return `https://api.dicebear.com/7.x/adventurer-neutral/svg?seed=${encodedSeed}&backgroundColor=FDB813`;
};
