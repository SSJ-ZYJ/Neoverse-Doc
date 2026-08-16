---
id: ch2
title: What is an Algorithm
description: Algorithms — Introduction to the Algorithms Chapter
status: draft
author:
    - "Collinor(https://github.com/Collinor)"
---

[Algorithms](https://en.wikipedia.org/wiki/Algorithm) are **one of the more difficult areas** in computer science, and also an **important indicator** for judging the professional ability of a computer practitioner.

(The following is introductory content)

Simply put, an algorithm is a set of clear, finite instruction sequences designed to solve a specific problem. This means that by executing input data step by step according to predetermined rules and processes, the output data that solves the problem is ultimately obtained.

In fact, algorithms are just like your fixed morning routine of `waking up → brushing teeth → washing face → eating breakfast → going out`, which is a "morning departure algorithm."  
Of course, the specific steps of the algorithm vary from person to person. Different people might adopt the order `waking up → washing face → brushing teeth → eating breakfast → going out`, but the end result is the same.  
In different application scenarios, algorithms also have different implementations. For example, when you are in a hurry in the morning, the "morning departure algorithm" can also be simplified to `waking up → going out`.

## Why We Need Algorithms

Early computers had extremely limited performance. Take [ENIAC](https://en.wikipedia.org/wiki/ENIAC), the first general-purpose electronic computer, as an example: it could only complete about 5,000 addition operations per second (for comparison, an ordinary computer today can perform billions of basic operations per second), and memory space was extremely tight.  
Under such harsh conditions, to make computers complete **complex tasks** such as missile trajectory calculations and codebreaking, it was necessary to deliberate repeatedly when designing programs, finding the most step-saving and memory-saving solutions. Even saving one operation could potentially compress computation time from months to hours.  
Therefore, early algorithms were more like a kind of "**frugality**" wisdom — using exquisite logic to compensate for hardware deficiencies.

As an analogy: imagine you need to hand-wash a pile of bowls. The sink has limited capacity and can only hold bowls with a total volume of 4 at most. Suppose you have several large bowls of volume 3, medium bowls of volume 2, and small bowls of volume 1. To finish washing as quickly as possible, the optimal approach is to pair one large bowl with one small bowl (3+1=4), and wash medium bowls separately (2+2=4). This is precisely maximizing space utilization through reasonable combinations, and the underlying idea is identical to the "[bin packing problem](https://en.wikipedia.org/wiki/Bin_packing_problem)" in computer science.

## Modern Algorithm Applications

Modern computer performance has improved by tens of millions of times, but the status of algorithms has not declined — instead, it has risen, because the complexity of problems themselves has also expanded simultaneously.  
The amount of data we generate every day has entered the ZB era. To enable search engines to precisely locate the exact web page you want among tens or hundreds of billions of web pages within milliseconds, to allow short video apps to guess the next video you'll be interested in in the blink of an eye, to make navigation software instantly plan the optimal route based on real-time traffic conditions... behind all of this, complex and exquisite algorithms are at work.

Algorithms have gradually evolved from early "labor-saving tools" to today's "**decision-making brains**." They determine the flow of information, the quality of services, and even directly affect personal and system security.  
Looking ahead, whether in autonomous driving, intelligent healthcare, climate prediction, or quantum computing, algorithms will continue to play a core role. Understanding algorithms means understanding the internal logic of how this digital world operates.

## Why Learn Algorithms

Learning algorithms is not only for improving programming ability, but more importantly for cultivating **systematic thinking** and **problem-solving ability**.

For an IT practitioner, algorithmic ability is an **indispensable hard skill**. There are many people who can write code, but programmers who can write efficient, scalable code that can calmly handle massive data and complex scenarios are always scarce.  
Algorithms are like the mechanics knowledge of architects — without it, you might be able to build a simple shed, but you could never construct a skyscraper. More importantly, what learning algorithms trains is a kind of "computational thinking": how to abstract vague practical problems into clear computational models, how to make trade-offs between time consumption and space consumption, and how to approach optimal solutions step by step...

Of course, learning algorithms can also help you make wiser decisions in other aspects of life and work. Therefore, algorithms are one of the key indicators that **distinguish ordinary programmers from excellent engineers**, and also an internal skill worth continuously honing on your career development path.

> [!TIP]  
> This chapter will use C++ for code examples, requiring you to be familiar with basic C++ syntax.  
> However, algorithms themselves are independent of programming languages. Any programming language can implement the same algorithms.
