export interface ProblemInfo {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
  recommendedMinutes: number;
}

export const CURATED_PROBLEMS: ProblemInfo[] = [
  // EASY
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    recommendedMinutes: 15,
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['String', 'Stack'],
    recommendedMinutes: 15,
  },
  {
    slug: 'merge-two-sorted-lists',
    title: 'Merge Two Sorted Lists',
    difficulty: 'Easy',
    tags: ['Linked List', 'Recursion'],
    recommendedMinutes: 15,
  },
  {
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    tags: ['Array', 'DP'],
    recommendedMinutes: 15,
  },
  {
    slug: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    tags: ['Two Pointers', 'String'],
    recommendedMinutes: 15,
  },
  {
    slug: 'invert-binary-tree',
    title: 'Invert Binary Tree',
    difficulty: 'Easy',
    tags: ['Tree', 'DFS'],
    recommendedMinutes: 15,
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    tags: ['Dynamic Programming', 'Math'],
    recommendedMinutes: 15,
  },
  {
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Table'],
    recommendedMinutes: 10,
  },

  // MEDIUM
  {
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    tags: ['Hash Table', 'Sliding Window', 'String'],
    recommendedMinutes: 25,
  },
  {
    slug: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    tags: ['Array', 'Two Pointers', 'Sorting'],
    recommendedMinutes: 25,
  },
  {
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    tags: ['Array', 'Two Pointers', 'Greedy'],
    recommendedMinutes: 20,
  },
  {
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    tags: ['Array', 'Hash Table', 'String'],
    recommendedMinutes: 20,
  },
  {
    slug: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    tags: ['Array', 'Hash Table', 'Heap'],
    recommendedMinutes: 20,
  },
  {
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    tags: ['Array', 'Prefix Sum'],
    recommendedMinutes: 20,
  },
  {
    slug: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    difficulty: 'Medium',
    tags: ['Array', 'Hash Table', 'Union Find'],
    recommendedMinutes: 25,
  },
  {
    slug: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    tags: ['Array', 'Binary Search'],
    recommendedMinutes: 25,
  },
  {
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    tags: ['Array', 'Dynamic Programming', 'BFS'],
    recommendedMinutes: 30,
  },

  // HARD
  {
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    tags: ['Array', 'Two Pointers', 'Dynamic Programming', 'Stack'],
    recommendedMinutes: 35,
  },
  {
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    tags: ['Array', 'Binary Search', 'Divide and Conquer'],
    recommendedMinutes: 40,
  },
  {
    slug: 'merge-k-sorted-lists',
    title: 'Merge k Sorted Lists',
    difficulty: 'Hard',
    tags: ['Linked List', 'Divide and Conquer', 'Heap'],
    recommendedMinutes: 35,
  },
];

export function getRandomProblem(difficulty?: 'All' | 'Easy' | 'Medium' | 'Hard'): ProblemInfo {
  let list = CURATED_PROBLEMS;
  if (difficulty && difficulty !== 'All') {
    list = CURATED_PROBLEMS.filter((p) => p.difficulty === difficulty);
  }
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}
